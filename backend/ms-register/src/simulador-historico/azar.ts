/** Generador reproducible: la misma semilla produce el mismo historial. */
export class Azar {
  private estado: number;

  constructor(semilla: string) {
    this.estado = 2166136261;
    for (const caracter of semilla) {
      this.estado ^= caracter.charCodeAt(0);
      this.estado = Math.imul(this.estado, 16777619);
    }
  }

  siguiente(): number {
    this.estado += 0x6d2b79f5;
    let valor = this.estado;
    valor = Math.imul(valor ^ (valor >>> 15), valor | 1);
    valor ^= valor + Math.imul(valor ^ (valor >>> 7), valor | 61);
    return ((valor ^ (valor >>> 14)) >>> 0) / 4294967296;
  }

  entero(minimo: number, maximo: number): number {
    return Math.floor(this.siguiente() * (maximo - minimo + 1)) + minimo;
  }

  elegir<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('No se puede elegir de una lista vacía.');
    return items[this.entero(0, items.length - 1)];
  }
}
