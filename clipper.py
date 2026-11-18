import subprocess
import os
import json
import sys
from datetime import datetime

# ==========================================
# CONFIGURACIÓN PRINCIPAL
# ==========================================
URL_VIDEO = "https://www.youtube.com/watch?v=0tRZdKQ5lHA"  # Pega aquí el link de YouTube
DURACION_CLIP = 30                                        # Duración fija en segundos (20s)
CARPETA_SALIDA = "clips_listos"
MARCA_AGUA = "Puedes visitar leonida-hub.vercel.app para encontrar toda la información de último momento de GTA VI"

# MODO DE CORTE:
# - Si pones tiempos en CORTES_MANUALES, solo sacará esos clips exactos.
# - Si lo dejas vacío (CORTES_MANUALES = []), cortará TODO el video automáticamente cada 20s.
CORTES_MANUALES = [
    ("00:00:02", "01"),
    ("00:00:38", "02"),
    ("00:01:12", "03"),
]

# ==========================================
# FUNCIONES DEL SISTEMA
# ==========================================
def obtener_duracion_total(archivo):
    cmd = [
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", archivo
    ]
    resultado = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    return float(resultado.stdout.strip())

def descargar_fuente(url):
    print("1. Descargando video base en máxima calidad...")
    subprocess.run([
        sys.executable, "-m", "yt_dlp",
        "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "-o", "temp_source.%(ext)s",
        url
    ], check=True)
    return next((f for f in os.listdir(".") if f.startswith("temp_source.")), None)

def renderizar_clip(archivo_fuente, inicio, ruta_salida):
    filtro_vf = (
        "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20:5[bg];"
        "[0:v]scale=1080:-2[fg];"
        "[bg][fg]overlay=(W-w)/2:(H-h)/2,"
        f"drawtext=fontfile='C\\:/Windows/Fonts/impact.ttf':text='{MARCA_AGUA}':"
        "fontcolor=white@0.85:fontsize=34:x=(w-text_w)/2:y=h-260:shadowcolor=black@0.8:shadowx=2:shadowy=2"
    )
    # Intenta renderizar usando la GPU NVIDIA GTX (h264_nvenc); si falla, usa CPU (libx264)
    comando_gpu = [
        "ffmpeg", "-y", "-ss", str(inicio), "-t", str(DURACION_CLIP),
        "-i", archivo_fuente, "-filter_complex", filtro_vf,
        "-c:v", "h264_nvenc", "-gpu", "0", "-preset", "p4", "-cq", "20", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k", ruta_salida
    ]
    comando_cpu = [
        "ffmpeg", "-y", "-ss", str(inicio), "-t", str(DURACION_CLIP),
        "-i", archivo_fuente, "-filter_complex", filtro_vf,
        "-c:v", "libx264", "-preset", "fast", "-crf", "20",
        "-c:a", "aac", "-b:a", "192k", ruta_salida
    ]

    try:
        subprocess.run(comando_gpu, check=True, stderr=subprocess.DEVNULL)
    except subprocess.CalledProcessError:
        subprocess.run(comando_cpu, check=True)

def ejecutar_farm():
    os.makedirs(CARPETA_SALIDA, exist_ok=True)
    archivo_fuente = descargar_fuente(URL_VIDEO)

    if not archivo_fuente:
        print("Error: No se pudo descargar el video.")
        return

    duracion_total = obtener_duracion_total(archivo_fuente)
    print(f"2. Video listo ({duracion_total:.1f}s totales). Iniciando cortes de {DURACION_CLIP}s...")

    lote = datetime.now().strftime("%Y%m%d_%H%M%S")
    lista_tareas = []
    if CORTES_MANUALES:
        for inicio, nombre in CORTES_MANUALES:
            lista_tareas.append((inicio, f"clip_{lote}_{nombre}.mp4"))
    else:
        # Corte automático cada 20 segundos
        segundo_actual = 0
        indice = 1
        while segundo_actual + DURACION_CLIP <= duracion_total:
            lista_tareas.append((segundo_actual, f"clip_auto_{lote}_{indice:02d}.mp4"))
            segundo_actual += DURACION_CLIP
            indice += 1

    for inicio, nombre_archivo in lista_tareas:
        ruta_final = os.path.join(CARPETA_SALIDA, nombre_archivo)
        print(f"   -> Generando {ruta_final} (desde {inicio})...")
        renderizar_clip(archivo_fuente, inicio, ruta_final)

    os.remove(archivo_fuente)
    print(f"\n¡Proceso terminado! {len(lista_tareas)} clips guardados en '{CARPETA_SALIDA}/'.")

if __name__ == "__main__":
    ejecutar_farm()