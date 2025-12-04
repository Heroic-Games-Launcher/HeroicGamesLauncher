// Direct port of https://github.com/wynick27/steam-missing-covers-downloader/blob/master/license_parser.py

export class RandomStream {
  private NTAB = 32
  private IA = 16807
  private IM = 2147483647
  private IQ = 127773
  private IR = 2836
  private NDIV = (1 + (2147483647 - 1) / 32) | 0
  private MAX_RANDOM_RANGE = 0x7fffffff

  private m_idum: number = 0
  private m_iy: number = 0
  private m_iv: number[] = new Array(32).fill(0)

  constructor() {
    this.set_seed(0)
  }

  private bigintToSigned32(n: bigint): number {
    // Convert BigInt to a signed 32-bit integer (Python equivalent)
    const mod = BigInt(0x100000000)
    let x = n % mod
    if (x >= BigInt(0x80000000)) x -= mod
    return Number(x)
  }

  public set_seed(seed: bigint | number): void {
    let s: number

    if (typeof seed === 'bigint') {
      s = this.bigintToSigned32(seed)
    } else {
      // Mimic Python: negative stays negative, positive becomes negative
      s = seed | 0
    }

    this.m_idum = s < 0 ? s : -s
    this.m_iy = 0
    this.m_iv = new Array(this.NTAB).fill(0)
  }

  private generate_random_number(): number {
    if (this.m_idum <= 0 || this.m_iy === 0) {
      if (-this.m_idum < 1) {
        this.m_idum = 1
      } else {
        this.m_idum = -this.m_idum
      }

      for (let j = this.NTAB + 7; j >= 0; j--) {
        const k = (this.m_idum / this.IQ) | 0
        this.m_idum = this.IA * (this.m_idum - k * this.IQ) - this.IR * k

        if (this.m_idum < 0) {
          this.m_idum += this.IM
        }

        if (j < this.NTAB) {
          this.m_iv[j] = this.m_idum
        }
      }
      this.m_iy = this.m_iv[0]
    }

    const k = (this.m_idum / this.IQ) | 0
    this.m_idum = this.IA * (this.m_idum - k * this.IQ) - this.IR * k

    if (this.m_idum < 0) {
      this.m_idum += this.IM
    }

    let j = (this.m_iy / this.NDIV) | 0

    if (j >= this.NTAB || j < 0) {
      j = j % this.NTAB & 0x7fffffff
    }

    this.m_iy = this.m_iv[j]
    this.m_iv[j] = this.m_idum

    return this.m_iy
  }

  public random_int(iLow: number, iHigh: number): number {
    const x = iHigh - iLow + 1

    if (x <= 1 || this.MAX_RANDOM_RANGE < x - 1) {
      return iLow
    }

    const maxAcceptable =
      this.MAX_RANDOM_RANGE - ((this.MAX_RANDOM_RANGE + 1) % x)

    while (true) {
      const n = this.generate_random_number()
      if (n <= maxAcceptable) {
        return iLow + (n % x)
      }
    }
  }

  public random_char(): number {
    return this.random_int(32, 126)
  }

  public decrypt_data(key: bigint | number, data: Uint8Array): Uint8Array {
    this.set_seed(key)

    const result = new Uint8Array(data.length)

    for (let i = 0; i < data.length; i++) {
      const b = this.random_char()
      result[i] = data[i] ^ b
    }

    return result
  }
}
