import os
import pandas as pd
from supabase import create_client, Client

# 1. Conexión a tu Supabase
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

# 2. Descargar el Google Sheet original usando tu ID exacto
csv_url = "https://docs.google.com/spreadsheets/d/1_YUqTbK7IxCYdGjMEhQK-qFQf8_KMC9uNlClQRKZjoM/export?format=csv"
print("Descargando datos del documento público...")
df = pd.read_csv(csv_url)

# 3. Limpiar y mapear columnas
# Convertimos los títulos originales a minúsculas para estandarizar
df.columns = df.columns.str.strip().str.lower()

# Mapeamos 'order', 'level', 'publisher' a la estructura de tu base de datos
df = df.rename(columns={
    "order": "level_uid",
    "level": "name",
    "publisher": "creator"
})

# Verificamos que las columnas existan tras el mapeo
columnas_requeridas = ["level_uid", "name", "creator"]
for col in columnas_requeridas:
    if col not in df.columns:
        print(f"Error: No se encontró la columna '{col}' en el Excel público.")
        exit(1)

# Nos quedamos solo con las columnas que importan y limpiamos campos vacíos
df = df[columnas_requeridas]
df = df.dropna(subset=["name"]) 
df = df.fillna("")

nuevos_registros = df.to_dict(orient="records")

# 4. Obtener datos actuales de TU base de datos para no sobreescribir
print("Consultando tu base de datos actual...")
respuesta_db = supabase.table("level_records").select("level_uid, name").execute()

# Creamos listas rápidas para identificar qué existe ya en tu página
nombres_existentes = {str(nivel["name"]).strip().lower() for nivel in respuesta_db.data}
ids_existentes = {int(nivel["level_uid"]) for nivel in respuesta_db.data}

# Identificamos cuál es tu ID más alto (ej. el 1002)
max_id = max(ids_existentes) if ids_existentes else 0

# 5. Filtrar y preparar SOLO los niveles verdaderamente NUEVOS
niveles_a_insertar = []

for nivel in nuevos_registros:
    nombre_nivel = str(nivel["name"]).strip()
    nombre_lower = nombre_nivel.lower()

    # REGLA DE ORO: Si el nivel ya lo tienes, lo saltamos para proteger tus videos
    if nombre_lower in nombres_existentes:
        continue

    # Si es un nivel nuevo, revisamos su ID (el 'order' original)
    try:
        uid_propuesto = int(nivel["level_uid"])
    except ValueError:
        uid_propuesto = max_id + 1

    # Si el Excel ajeno quiere usar un ID que tú ya tienes ocupado, le asignamos uno nuevo
    if uid_propuesto in ids_existentes:
        max_id += 1
        uid_propuesto = max_id
    
    # Lo agregamos a la memoria para que el siguiente nivel no choque con este
    ids_existentes.add(uid_propuesto)

    # Preparamos la fila exacta para Supabase con tus columnas adicionales vacías
    nivel_limpio = {
        "level_uid": uid_propuesto,
        "name": nombre_nivel,
        "creator": str(nivel["creator"]).strip(),
        "completed": False, 
        "youtube_url": ""   
    }
    niveles_a_insertar.append(nivel_limpio)

# 6. Subir a Supabase
if len(niveles_a_insertar) > 0:
    print(f"¡Se encontraron {len(niveles_a_insertar)} niveles nuevos! Agregándolos...")
    # Usamos 'insert' para asegurar que solo agregamos entradas nuevas
    supabase.table("level_records").insert(niveles_a_insertar).execute()
    print("Base de datos actualizada con éxito.")
else:
    print("No se encontraron niveles nuevos en el Excel público. Todo está al día.")