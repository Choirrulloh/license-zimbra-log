# 📚 Panduan Obfuscation - Code Protection

## 🔴 BASH Script Obfuscation (.sh files)

### ❌ **PERINGATAN: Obfuscation Level TIDAK ADA BEDANYA!**

Semua level (Basic, Medium, Advanced) menghasilkan output yang **IDENTIK**. Parameter `level` tidak digunakan dalam implementasi.

### Teknik yang Digunakan:
- ✅ Base64 encoding per line
- ✅ Random variable names (`_abc12`, `_xyz45`, dll)
- ✅ Eval execution untuk menjalankan decoded command

### ❌ Advanced Options: TIDAK ADA

### Contoh Output:

**Original Script:**
```bash
#!/bin/bash
echo "Hello World"
SERVER_URL="https://example.com"
echo "Connecting to $SERVER_URL"
```

**Obfuscated Script (SEMUA LEVEL SAMA):**
```bash
#!/bin/bash

_mtrwvf="ZWNobyAiSGVsbG8gV29ybGQi"
eval "$(echo "$_mtrwvf" | base64 -d)"
_xll80="U0VSVkVSX1VSTD0iaHR0cHM6Ly9leGFtcGxlLmNvbSI="
eval "$(echo "$_xll80" | base64 -d)"
_x9av="ZWNobyAiQ29ubmVjdGluZyB0byAkU0VSVkVSX1VSTCI="
eval "$(echo "$_x9av" | base64 -d)"
```

---

## 🟢 JAVASCRIPT Obfuscation (.js files)

### ✅ **Obfuscation Level ADA PERBEDAAN SIGNIFIKAN!**

### Level 1: BASIC (Low)
**Fitur:**
- ✅ Compact/minify
- ✅ Variable renaming (hexadecimal)
- ❌ String array: OFF
- ❌ Control flow flattening: OFF
- ❌ Dead code injection: OFF
- ❌ Self defending: OFF

**Contoh:**
```javascript
// Original
function calculatePrice(basePrice, taxRate) {
  const tax = basePrice * taxRate;
  return tax;
}

// Obfuscated (Basic)
function calculatePrice(_0x1400b4,_0xa1c05f){
  const _0x1c3d15=_0x1400b4*_0xa1c05f;
  return _0x1c3d15;
}
```

**Kegunaan:** Code masih cukup mudah dibaca, hanya variable di-rename.

---

### Level 2: MEDIUM

**Fitur:**
- ✅ Compact/minify
- ✅ Variable renaming
- ✅ **String array: ON (75%)** ← PERBEDAAN UTAMA
- ✅ String rotation & shuffle
- ✅ String splitting (chunk 10 char)
- ✅ Transform object keys
- ❌ Control flow flattening: OFF
- ❌ Dead code injection: OFF
- ❌ Self defending: OFF

**Contoh:**
```javascript
// Original
const productName = "Premium Widget";
console.log("Base Price: $" + basePrice);

// Obfuscated (Medium)
function _0x2466(_0x2abb8b,_0x29e60b){
  const _0x236bde=_0x236b();
  return _0x2466=function(_0x2466c7,_0x124d3b){
    _0x2466c7=_0x2466c7-0x79;
    let _0x4e857b=_0x236bde[_0x2466c7];
    return _0x4e857b;
  },_0x2466(_0x2abb8b,_0x29e60b);
}

function _0x236b(){
  const _0x5bdbe=['Premium\x20Wi',':\x20$','Base\x20Price'];
  _0x236b=function(){return _0x5bdbe;};
  return _0x236b();
}

const _0x4cbfe8=_0x2466;
const productName=_0x4cbfe8(0x87)+'dget';  // "Premium Widget"
console[_0x4cbfe8(0x7d)](_0x4cbfe8(0x7e)+basePrice); // "Base Price: $"
```

**Kegunaan:** Strings disimpan dalam array terenkripsi, lebih sulit dibaca.

---

### Level 3: ADVANCED (High)

**Fitur:**
- ✅ Compact/minify
- ✅ Variable renaming
- ✅ **String array: ON (85%)** ← Lebih agresif
- ✅ String rotation & shuffle
- ✅ String splitting (chunk 5 char) ← Lebih kecil
- ✅ Transform object keys
- ✅ **Control flow flattening: ON (75%)** ← PERBEDAAN BESAR
- ✅ **Dead code injection: ON (40%)** ← PERBEDAAN BESAR
- ✅ **Self defending: ON** ← PERBEDAAN BESAR
- ✅ **Unicode escape: ON** ← PERBEDAAN BESAR

**Kegunaan:** Code SANGAT sulit dibaca, control flow di-flatten, ada dead code palsu, self-defending (crash jika di-beautify).

---

## 🎯 Advanced Options (HANYA untuk JavaScript)

### 1. **String Encoding** (`stringArray`)
**Fungsi:** Encode semua string ke dalam array terenkripsi

**Contoh:**
```javascript
// Without String Encoding:
console.log("Base Price: $" + basePrice);

// With String Encoding:
function _0x30fa(_0x1c7a5e,_0x2ea2ef){
  const _0x1a91d6=_0x1a91();
  return _0x30fa=function(_0x30fa44,_0x4901c7){
    _0x30fa44=_0x30fa44-0xdf;
    let _0x5e4d9a=_0x1a91d6[_0x30fa44];
    return _0x5e4d9a;
  },_0x30fa(_0x1c7a5e,_0x2ea2ef);
}
function _0x1a91(){
  const _0x3f6f8b=['Base\x20Price:\x20$','Tax:\x20$','log'];
  _0x1a91=function(){return _0x3f6f8b;};
  return _0x1a91();
}
const _0xfc339d=_0x30fa;
console[_0xfc339d(0xe7)](_0xfc339d(0xe5)+basePrice);
```

**Dampak:** String "Base Price: $" tersembunyi dalam array `_0x3f6f8b`

---

### 2. **Control Flow Flattening** (`controlFlow`)
**Fungsi:** Mengubah struktur if/else/switch menjadi switch-case yang flat

**Contoh:**
```javascript
// Without Control Flow:
function calculatePrice(basePrice, taxRate) {
  const tax = basePrice * taxRate;
  const total = basePrice + tax;
  return total;
}

// With Control Flow Flattening:
function calculatePrice(_0x5109df,_0x98c266){
  const _0x591dc8={
    'szKAr':function(_0x2773cd,_0x254adb){return _0x2773cd*_0x254adb;},
    'JHQgJ':function(_0x3c7296,_0x2df2c4){return _0x3c7296+_0x2df2c4;},
    'SpZvq':function(_0x309b27,_0x10fa0a){return _0x309b27+_0x10fa0a;}
  };
  const _0x26f7aa=_0x591dc8['szKAr'](_0x5109df,_0x98c266);
  const _0x5e619f=_0x591dc8['JHQgJ'](_0x5109df,_0x26f7aa);
  return _0x5e619f;
}
```

**Dampak:** Operasi sederhana dibungkus dalam object methods, alur logic jadi tidak linear.

---

### 3. **Dead Code Injection** (`deadCode`)
**Fungsi:** Inject kode palsu yang tidak pernah dieksekusi (misleading)

**Contoh:**
```javascript
// Tanpa Dead Code: code pendek dan jelas

// Dengan Dead Code: code jadi 3-5x lebih panjang dengan banyak if-else palsu
(function(_0x2d0f35,_0x1c5896){
  const _0x59361a=_0x2f88,_0x236553=_0x2d0f35();
  while(!![]){  // Dead code loop
    try{
      const _0x106e7a=parseInt(_0x59361a(0xa4))/0x1*(parseInt(_0x59361a(0x98))/0x2);
      if(_0x106e7a===_0x1c5896)break;
      else _0x236553['push'](_0x236553['shift']());
    }catch(_0x2fd5d4){
      _0x236553['push'](_0x236553['shift']());
    }
  }
})(_0x4128,0x3b026);
```

**Dampak:** Code size membesar, banyak code yang sebenarnya tidak pernah jalan.

---

### 4. **Rename Global Variables** (`renameVariables`)
**Fungsi:** Rename semua global variables (const, let, var) di level top

**Contoh:**
```javascript
// Without Rename:
const productName = "Premium Widget";
const price = calculatePrice(100, 0.15);

// With Rename:
const _0x5c3de0 = "Premium Widget";  // productName renamed
const _0x20a2ab = _0x26441a(0x64,0.15);  // price renamed, calculatePrice renamed
```

**Dampak:** Semua variable global di-rename jadi tidak bermakna.

---

### 5. **Disable Console** (`disableConsole`)
**Fungsi:** Inject code untuk disable semua console.log/warn/error di browser

**Contoh:**
```javascript
// Inject code yang override console object
const _0xa7a47f=function(){
  let _0x423de9;
  try{
    _0x423de9=Function('return\x20(function()\x20'+'{}.constructor(\x22return\x20this\x22)(\x20)'+');')();
  }catch(_0x478e8b){
    _0x423de9=window;
  }
  return _0x423de9;
};
const _0x48c174=_0xa7a47f();
const _0xc731a6=_0x48c174['console']=_0x48c174['console']||{};
const _0x4bfff5=['log','warn','info','error','exception','table','trace'];
for(let _0x4392ac=0x0;_0x4392ac<_0x4bfff5['length'];_0x4392ac++){
  // Override semua console methods
  _0xc731a6[_0x4bfff5[_0x4392ac]]=function(){};
}
```

**Dampak:** Semua `console.log()` tidak akan print apa-apa di browser.

---

### 6. **Compact** (Minify)
**Fungsi:** Remove whitespace, newlines, make code one-liner

**Tanpa Compact:**
```javascript
function calculatePrice(_0x335320, _0xb1b8bb) {
    const _0x4067fc = _0x335320 * _0xb1b8bb;
    const _0x8aa142 = _0x335320 + _0x4067fc;
    return _0x8aa142;
}
```

**Dengan Compact:**
```javascript
function calculatePrice(_0x335320,_0xb1b8bb){const _0x4067fc=_0x335320*_0xb1b8bb,_0x8aa142=_0x335320+_0x4067fc;return _0x8aa142;}
```

**Dampak:** File size lebih kecil, sulit dibaca (tapi bisa di-beautify lagi).

---

## 📊 Rekomendasi

### Untuk BASH:
❌ **Jangan andalkan level**, semua sama.
✅ Level apapun sudah cukup untuk proteksi basic (base64).

### Untuk JAVASCRIPT:

| Use Case | Recommended Level | Advanced Options |
|----------|------------------|------------------|
| Development/Testing | Basic | - |
| Production (Normal) | Medium | stringEncoding |
| High Security | Advanced | stringEncoding + controlFlow + deadCode |
| Anti-Debugging | Advanced | stringEncoding + controlFlow + disableConsole + selfDefending |
| Maximum Protection | Advanced | ALL OPTIONS ON |

⚠️ **Trade-off:**
- **Basic:** Fast execution, small file size, mudah di-reverse
- **Medium:** Balanced antara security dan performance
- **Advanced:** Slow execution, file size 3-5x lebih besar, sulit di-reverse

---

## 🔧 Kesimpulan

### BASH Script:
- Level obfuscation = **TIDAK ADA BEDANYA**
- Hanya ada 1 teknik: Base64 + Eval
- Proteksi level: **Low** (mudah di-decode dengan `base64 -d`)

### JavaScript:
- Level obfuscation = **ADA PERBEDAAN SIGNIFIKAN**
- Basic → Medium → Advanced memiliki kompleksitas yang meningkat
- Proteksi level: **Basic = Low**, **Medium = Medium**, **Advanced = High**
- Advanced options memberikan layer proteksi tambahan

**Rekomendasi:**
- Untuk production JavaScript: gunakan **Medium** atau **Advanced**
- Untuk Bash: level apapun sama, tapi tetap inject license validation
