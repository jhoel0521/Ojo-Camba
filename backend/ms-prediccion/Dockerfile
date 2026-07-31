# ms-prediccion (ISSUE-31) — pronostico semanal de Casos de Obra.
#
# Python 3.12 y no la ultima: es la version con wheels estables para pandas,
# numpy y scikit-learn, y evita compilar nada al construir.
FROM python:3.12-slim

WORKDIR /app

# Sin capa de compiladores: todas las dependencias traen wheel para esta imagen.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# El modelo entrenado y el cache de clima viven fuera de la imagen para que un
# redeploy no borre lo entrenado (montar como volumen en Coolify).
RUN mkdir -p /app/modelos /app/datos

ENV PYTHONUNBUFFERED=1
EXPOSE 3007

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3007"]
