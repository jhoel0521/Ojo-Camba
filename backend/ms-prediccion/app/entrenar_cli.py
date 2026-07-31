"""
Entrenamiento por linea de comandos (ISSUE-31).

    python -m app.entrenar_cli [--semanas-prueba 12] [--sin-clima]

Se ejecuta a mano, no al arrancar el servicio: en el VPS actual un
entrenamiento desatendido compite por memoria con el resto de la plataforma.
"""

from __future__ import annotations

import argparse
import sys

from sqlalchemy import create_engine

from . import clima as modulo_clima
from . import dataset as modulo_dataset
from .config import obtener_config
from .entrenamiento import entrenar_y_guardar


def main() -> int:
    parser = argparse.ArgumentParser(description="Entrena el pronostico semanal de Casos.")
    parser.add_argument("--semanas-prueba", type=int, default=12)
    parser.add_argument(
        "--sin-clima",
        action="store_true",
        help="Omite Open-Meteo (util sin red; queda registrado en la procedencia).",
    )
    argumentos = parser.parse_args()

    config = obtener_config()
    engine = create_engine(config.database_url)

    print("1/4 leyendo Casos y reportes de la base...")
    base = modulo_dataset.completar_rejilla(modulo_dataset.leer_base(engine))
    if base.empty:
        print("ERROR: no hay Casos de Obra en la base. Corre antes el simulador historico.")
        return 1
    print(f"    {len(base):,} filas (semana x zona x categoria)")

    procedencia = {"fuente": "no incorporado", "motivo": "ejecutado con --sin-clima"}
    semanal = None
    if not argumentos.sin_clima:
        print("2/4 descargando clima real de Open-Meteo...")
        desde = base["semana"].min().date()
        hasta = base["semana"].max().date()
        try:
            semanal, procedencia = modulo_clima.obtener(
                config.lat_ciudad,
                config.lng_ciudad,
                desde,
                hasta,
                cache=config.directorio_datos / "clima_semanal.json",
            )
            print(f"    {len(semanal)} semanas de precipitacion y temperatura")
        except Exception as error:  # noqa: BLE001
            print(f"    aviso: no se pudo obtener el clima ({error}). Se sigue sin esa variable.")
            procedencia = {"fuente": "no incorporado", "motivo": str(error)}
    else:
        print("2/4 clima omitido por --sin-clima")

    print("3/4 construyendo dataset con rezagos...")
    datos = modulo_dataset.construir(engine, semanal)
    print(f"    {len(datos):,} filas utilizables tras descartar semanas sin historia")

    print("4/4 entrenando y comparando los tres modelos...")
    metadatos = entrenar_y_guardar(
        datos,
        config.directorio_modelos,
        procedencia,
        origen_datos="simulador historico ISSUE-28 (sintetico)",
        semanas_prueba=argumentos.semanas_prueba,
    )

    print(f"\ncorte temporal: hasta {metadatos['corte_temporal']} entrena, despues prueba")
    print(f"{'modelo':<20} {'MAE':>8} {'RMSE':>8} {'R2':>8}   diagnostico")
    for resultado in metadatos["comparacion"]:
        prueba = resultado["prueba"]
        print(
            f"{resultado['nombre']:<20} {prueba['mae']:>8.3f} {prueba['rmse']:>8.3f} "
            f"{prueba['r2']:>8.3f}   {resultado['diagnostico']}"
        )

    print(f"\nelegido: {metadatos['modelo_elegido']} — {metadatos['justificacion']}")
    principales = list(metadatos["importancia_variables"].items())[:5]
    print("variables mas influyentes: " + ", ".join(f"{c} ({v:.1%})" for c, v in principales))
    return 0


if __name__ == "__main__":
    sys.exit(main())
