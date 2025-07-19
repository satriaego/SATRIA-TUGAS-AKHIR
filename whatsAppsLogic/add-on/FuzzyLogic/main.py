import sys

if __name__ == "__main__":
    try:
        suhu_input = float(sys.argv[1])
        orang_input = float(sys.argv[2])
    except:
        print("Invalid input")
        sys.exit(1)


import numpy as np

def trapmf(x, a, b, c, d):
    return np.where(
        (x <= a) | (x >= d), 0,
        np.where(
            (x >= b) & (x <= c), 1,
            np.where(
                (x > a) & (x < b), (x - a) / (b - a + 1e-6),
                (d - x) / (d - c + 1e-6)
            )
        )
    )

def sugeno_fis_debug(suhu, jumlah_orang, debug=True):

    suhu_mfs = {
        'Rendah': trapmf(suhu, 1, 17.76, 22, 25),  
        'Sedang': trapmf(suhu, 22.68, 24.68, 27.68, 29.68),
        'Panas':  trapmf(suhu, 27.15, 30.15, 34.15, 35.27)
    }

    orang_mfs = {
        'Sedikit': trapmf(jumlah_orang, 0, 1, 2, 3),
        'Sedang':  trapmf(jumlah_orang, 2, 2.5, 4.5, 5),
        'Banyak':  trapmf(jumlah_orang, 4, 5, 8.228, 8.56),
        'Kosong':  trapmf(jumlah_orang, -1, -1, 0, 1)
    }

    output_values = {
        "Tinggi": 3,
        "Sedang": 2,
        "Rendah": 1,
        "Mati": 0
    }


    rules = [
        ('Rendah', 'Banyak',  'Sedang'),
        ('Rendah', 'Sedang',  'Rendah'),
        ('Rendah', 'Sedikit', 'Rendah'),
        ('Sedang', 'Banyak',  'Tinggi'),
        ('Sedang', 'Sedang',  'Sedang'),
        ('Sedang', 'Sedikit', 'Rendah'),
        ('Panas',  'Banyak',  'Tinggi'),  
        ('Panas',  'Sedang',  'Tinggi'),
        ('Panas',  'Sedikit', 'Sedang'),
        ('Rendah', 'Kosong',  'Mati'),
        ('Sedang', 'Kosong',  'Mati'),
        ('Panas',  'Kosong',  'Mati')
    ]

    weighted_sum = 0.0
    total_weight = 0.0

    if debug:
        print("\n🔍 Membership values:")
        for key in suhu_mfs:
            print(f"  Suhu '{key}': {suhu_mfs[key]:.4f}")
        for key in orang_mfs:
            print(f"  Orang '{key}': {orang_mfs[key]:.4f}")

        print("\n🧠 Rule evaluations:")

    for suhu_key, orang_key, output_label in rules:
        firing_strength = suhu_mfs[suhu_key] * orang_mfs[orang_key]
        if debug:
            print(f"  IF Suhu={suhu_key} AND Orang={orang_key} THEN {output_label} [Strength={firing_strength:.4f}]")
        weighted_sum += firing_strength * output_values[output_label]
        total_weight += firing_strength

    if total_weight == 0:
        return None  # No rules fired
    return weighted_sum / total_weight

# Function to ensure input is within valid range
def validate_input(value, min_value, max_value, default_value):
    if value < min_value:
        return default_value
    elif value > max_value:
        return max_value
    return value

def get_relay_level(sugeno_result):
    if sugeno_result < 0.5:
        return 0  # Mati
    elif sugeno_result < 1.5:
        return 1  # Rendah
    elif sugeno_result < 2.5:
        return 2  # Sedang
    else:
        return 3  # Cepat
    



# #input
# suhu_input = float(input("Masukkan suhu (18–34): "))
# orang_input = float(input("Masukkan jumlah orang (0–7): "))

# #input adjustmen
# suhu_input = validate_input(suhu_input, 18, 34, 18)  
# orang_input = validate_input(orang_input, 0, 7, 7)   

# result = sugeno_fis_debug(suhu_input, orang_input)
# relay_level = get_relay_level(result)

suhu_input = validate_input(suhu_input, 18, 34, 18)
orang_input = validate_input(orang_input, 0, 7, 7)

result = sugeno_fis_debug(suhu_input, orang_input, debug=False)
relay_level = get_relay_level(result)

print(relay_level, result)

# if result is not None:
#     print(f"\n🔥 suhu input: {suhu_input}")
#     print(f"👤 jumlah orang: {orang_input}")
#     print(f"\n✅ Set Kecepatan Kipas (Sugeno): {result:.2f}")
#     print(f"🔌 Relay Level: {relay_level} => {'Mati' if relay_level == 0 else 'Rendah' if relay_level == 1 else 'Sedang' if relay_level == 2 else 'Cepat'}")

# else:
#     print("\n❌ Tidak ada aturan yang aktif. Coba nilai input lain.")
