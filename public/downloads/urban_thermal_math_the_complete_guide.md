# Urban Thermal Math & Spatial Graph Analytics: The Complete "Dummies Guide"

This guide breaks down every advanced mathematical concept, formula, and analytical tool used in modern urban heat modeling, satellite remote sensing, spectral graph theory, and spatial probability into plain English. Every single concept features two concrete, step-by-step real-world numerical examples.

---

## Table of Contents

1. [Radiometric Calibration & Thermal Math](#1-radiometric-calibration--thermal-math)
   - 1.1 Digital Numbers (DN) to TOA Radiance
   - 1.2 Top-of-Atmosphere (TOA) Brightness Temperature & Planck's Law
   - 1.3 Normalized Difference Vegetation Index (NDVI)
   - 1.4 Fractional Vegetation Cover ($P_v$ / FVC)
   - 1.5 Land Surface Emissivity ($\varepsilon$)
   - 1.6 Single-Channel Emissivity-Corrected LST
   - 1.7 Split-Window Algorithm (SWA) LST
2. [Graph Theory & Network Math](#2-graph-theory--network-math)
   - 2.1 Adjacency Matrix ($A$)
   - 2.2 Degree Matrix ($D$)
   - 2.3 Unnormalized Graph Laplacian ($L = D - A$)
   - 2.4 Symmetric Normalized Graph Laplacian ($L_{\text{sym}}$)
3. [Spectral Graph Theory & Clustering](#3-spectral-graph-theory--clustering)
   - 3.1 Fiedler Vector & Fiedler Value ($\lambda_2$)
   - 3.2 Cheeger Constant ($\text{h}(G)$ / Isoperimetric Constant)
   - 3.3 Cheeger Cut & Cheeger Inequality
   - 3.4 Spectral Clustering Algorithm
   - 3.5 Modularity ($Q$) & Graph Partitioning
4. [Probability, Statistics & Spatial Risk Modeling](#4-probability-statistics--spatial-risk-modeling)
   - 4.1 Global Moran's I (Spatial Autocorrelation)
   - 4.2 Local Moran's I (LISA / Spot Detection)
   - 4.3 Probability Density Functions (PDFs) for Heat Waves
   - 4.4 Joint & Conditional Probabilities of Thermal Vulnerability
   - 4.5 Markov Chains & Land-Use Transition Matrices
   - 4.6 Extreme Value Theory (Generalized Extreme Value / GEV Distribution)
   - 4.7 Risk & Population Exposure Modeling
5. [Combinatorics & Graph Optimization](#5-combinatorics--graph-optimization)
   - 5.1 Combinatorial Graph Cuts
   - 5.2 Minimum Cut / Maximum Flow Algorithm
   - 5.3 Permutations & Combinations for Spatial Subgraphs
   - 5.4 NP-Hard Partitioning & Greedy Heuristics

---

# 1. Radiometric Calibration & Thermal Math

---

### 1.1 Digital Numbers (DN) to TOA Radiance

#### 💡 What is this in plain English?
Satellites store images as raw digital pixels called **Digital Numbers (DN)** (e.g., integers from 0 to 65,535). To do thermal science, we convert these unitless pixel values into **Top-of-Atmosphere (TOA) Radiance** ($L_\lambda$), which measures physical light and heat energy hitting the satellite sensor in $\text{W}\cdot\text{m}^{-2}\cdot\text{sr}^{-1}\cdot\mu\text{m}^{-1}$.

#### 📐 The Math Formula
$$L_\lambda = M_L \cdot \text{DN} + A_L$$

* $M_L$: Radiance multiplicative scaling factor (from metadata).
* $A_L$: Radiance additive scaling factor (from metadata).

#### 🧪 Example 1: Sunny Asphalt Parking Lot
* **Given:** $M_L = 0.0003342$, $A_L = 0.10000$, $\text{DN} = 32,500$.
1. Multiply: $32,500 \times 0.0003342 = 10.8615$
2. Add offset: $10.8615 + 0.10000 = 10.9615$
* **Result:** $L_\lambda = \mathbf{10.9615}\text{ W}\cdot\text{m}^{-2}\cdot\text{sr}^{-1}\cdot\mu\text{m}^{-1}$.

#### 🧪 Example 2: Dense Forest Canopy
* **Given:** $M_L = 0.0003342$, $A_L = 0.10000$, $\text{DN} = 22,000$.
1. Multiply: $22,000 \times 0.0003342 = 7.3524$
2. Add offset: $7.3524 + 0.10000 = 7.4524$
* **Result:** $L_\lambda = \mathbf{7.4524}\text{ W}\cdot\text{m}^{-2}\cdot\text{sr}^{-1}\cdot\mu\text{m}^{-1}$.

---

### 1.2 Top-of-Atmosphere (TOA) Brightness Temperature & Planck's Law

#### 💡 What is this in plain English?
**Brightness Temperature ($T_b$)** is the temperature an object *appears* to have if it radiates heat as a perfect "blackbody" (an idealized object that absorbs and emits 100% of radiation). It uses the inverse of **Planck's Radiation Law** to turn energy ($L_\lambda$) directly into temperature ($K$ or $\text{°C}$).

#### 📐 The Math Formula
$$T_b = \frac{K_2}{\ln\left(\frac{K_1}{L_\lambda} + 1\right)} - 273.15$$

* $K_1, K_2$: Calibration constants (For Landsat 8 Band 10: $K_1 = 774.8853$, $K_2 = 1321.0789$).

#### 🧪 Example 1: Concrete Mall ($L_\lambda = 10.9615$)
1. Ratio: $774.8853 / 10.9615 = 70.6915$
2. Log argument: $70.6915 + 1 = 71.6915$
3. Natural Log: $\ln(71.6915) = 4.2724$
4. Temperature (K): $1321.0789 / 4.2724 = 309.21\text{ K}$
5. Convert to Celsius: $309.21 - 273.15 = 36.06\text{°C}$
* **Result:** $T_b = \mathbf{36.06\text{°C}}$.

#### 🧪 Example 2: Dense Forest ($L_\lambda = 7.4524$)
1. Ratio: $774.8853 / 7.4524 = 103.9779$
2. Log argument: $103.9779 + 1 = 104.9779$
3. Natural Log: $\ln(104.9779) = 4.6537$
4. Temperature (K): $1321.0789 / 4.6537 = 283.88\text{ K}$
5. Convert to Celsius: $283.88 - 273.15 = 10.73\text{°C}$
* **Result:** $T_b = \mathbf{10.73\text{°C}}$.

---

### 1.3 Normalized Difference Vegetation Index (NDVI)

#### 💡 What is this in plain English?
**NDVI** measures green vegetation density. Healthy green leaves absorb Red light for photosynthesis and strongly reflect Near-Infrared (NIR) light to avoid overheating. Concrete, bare ground, and water bounce back light very differently.
* $+1.0$: Thick forest.
* $0.0$: Concrete/asphalt.
* $-1.0$: Water.

#### 📐 The Math Formula
$$\text{NDVI} = \frac{\text{NIR} - \text{RED}}{\text{NIR} + \text{RED}}$$

#### 🧪 Example 1: Suburban Golf Course
* **Given:** $\text{NIR} = 0.55$, $\text{RED} = 0.05$.
1. Difference: $0.55 - 0.05 = 0.50$
2. Sum: $0.55 + 0.05 = 0.60$
3. Ratio: $0.50 / 0.60 = 0.833$
* **Result:** $\text{NDVI} = \mathbf{0.833}$ (Very green plant cover).

#### 🧪 Example 2: Urban Highway Interchange
* **Given:** $\text{NIR} = 0.15$, $\text{RED} = 0.20$.
1. Difference: $0.15 - 0.20 = -0.05$
2. Sum: $0.15 + 0.20 = 0.35$
3. Ratio: $-0.05 / 0.35 = -0.143$
* **Result:** $\text{NDVI} = \mathbf{-0.143}$ (Non-vegetated pavement).

---

### 1.4 Fractional Vegetation Cover ($P_v$ / FVC)

#### 💡 What is this in plain English?
A single satellite pixel ($30\text{m} \times 30\text{m}$) usually contains a mixture of concrete, soil, and grass. **Fractional Vegetation Cover ($P_v$)** calculates the exact percentage ($0\%$ to $100\%$) of that pixel covered by plant leaves.

#### 📐 The Math Formula
$$P_v = \left( \frac{\text{NDVI} - \text{NDVI}_{\min}}{\text{NDVI}_{\max} - \text{NDVI}_{\min}} \right)^2$$

* $\text{NDVI}_{\min} = 0.20$ (pure soil), $\text{NDVI}_{\max} = 0.80$ (pure dense foliage).

#### 🧪 Example 1: Suburban Residential Street ($\text{NDVI} = 0.44$)
1. Numerator: $0.44 - 0.20 = 0.24$
2. Denominator: $0.80 - 0.20 = 0.60$
3. Unsquared fraction: $0.24 / 0.60 = 0.40$
4. Square it: $(0.40)^2 = 0.16$
* **Result:** $P_v = \mathbf{0.16}$ (16% of the pixel is green plant canopy).

#### 🧪 Example 2: Urban Park ($\text{NDVI} = 0.68$)
1. Numerator: $0.68 - 0.20 = 0.48$
2. Denominator: $0.80 - 0.20 = 0.60$
3. Unsquared fraction: $0.48 / 0.60 = 0.80$
4. Square it: $(0.80)^2 = 0.64$
* **Result:** $P_v = \mathbf{0.64}$ (64% green plant canopy).

---

### 1.5 Land Surface Emissivity ($\varepsilon$)

#### 💡 What is this in plain English?
Real-world materials emit thermal radiation less efficiently than a perfect theoretical blackbody. **Land Surface Emissivity ($\varepsilon$)** is a scale factor from $0.0$ to $1.0$ that tells us how efficiently a surface radiates heat. Plants are very efficient ($\approx 0.985$), whereas concrete and bare soils are less efficient ($\approx 0.960 - 0.970$).

#### 📐 The Math Formula
$$\varepsilon = 0.004 \cdot P_v + 0.986$$

#### 🧪 Example 1: Suburban Pixel ($P_v = 0.16$)
1. Multiply: $0.004 \times 0.16 = 0.00064$
2. Add baseline: $0.00064 + 0.986 = 0.98664$
* **Result:** $\varepsilon = \mathbf{0.98664}$.

#### 🧪 Example 2: Park Pixel ($P_v = 0.64$)
1. Multiply: $0.004 \times 0.64 = 0.00256$
2. Add baseline: $0.00256 + 0.986 = 0.98856$
* **Result:** $\varepsilon = \mathbf{0.98856}$.

---

### 1.6 Single-Channel Emissivity-Corrected LST

#### 💡 What is this in plain English?
This step computes the **true physical temperature of the ground**. It takes the apparent Brightness Temperature ($T_b$) from satellite thermal sensors and corrects it using the surface's emissivity ($\varepsilon$).

#### 📐 The Math Formula
$$\text{LST} = \frac{T_b}{1 + \left( \frac{\lambda \cdot T_b}{\rho} \right) \cdot \ln(\varepsilon)} - 273.15$$

* $T_b$: Brightness Temperature in Kelvin ($K$).
* $\lambda$: Emitted radiance wavelength ($\approx 11.5\,\mu\text{m}$).
* $\rho = \frac{h \cdot c}{\sigma} \approx 14,388\,\mu\text{m}\cdot\text{K}$.

#### 🧪 Example 1: Concrete Parking Lot ($T_b = 309.21\text{ K}$, $\varepsilon = 0.965$)
1. Natural log of emissivity: $\ln(0.965) = -0.03563$
2. Wavelength term: $(11.5 \times 309.21) / 14,388 = 0.24714$
3. Product: $0.24714 \times (-0.03563) = -0.008806$
4. Denominator: $1 + (-0.008806) = 0.991194$
5. Corrected Kelvin: $309.21 / 0.991194 = 311.96\text{ K}$
6. Convert to Celsius: $311.96 - 273.15 = 38.81\text{°C}$
* **Result:** True Ground LST = $\mathbf{38.81\text{°C}}$ (Warm surface emitted less heat, so true temp is higher than raw sensor reading).

#### 🧪 Example 2: Dense Lawn ($T_b = 283.88\text{ K}$, $\varepsilon = 0.990$)
1. Natural log of emissivity: $\ln(0.990) = -0.01005$
2. Wavelength term: $(11.5 \times 283.88) / 14,388 = 0.22690$
3. Product: $0.22690 \times (-0.01005) = -0.002280$
4. Denominator: $1 + (-0.002280) = 0.997720$
5. Corrected Kelvin: $283.88 / 0.997720 = 284.53\text{ K}$
6. Convert to Celsius: $284.53 - 273.15 = 11.38\text{°C}$
* **Result:** True Ground LST = $\mathbf{11.38\text{°C}}$.

---

### 1.7 Split-Window Algorithm (SWA) LST

#### 💡 What is this in plain English?
Modern satellites (like Landsat 8/9 or MODIS) have **two** thermal camera channels (Bands 10 and 11) instead of one. Atmospheric water vapor bends heat differently at these two slightly different wavelengths. The **Split-Window Algorithm** compares both bands simultaneously to cancel out atmospheric moisture distortion without needing weather balloon data.

#### 📐 The Math Formula
$$\text{LST} = T_{b10} + c_1(T_{b10} - T_{b11}) + c_2(T_{b10} - T_{b11})^2 + c_0 + (a_1 + a_2 \cdot W)(1 - \varepsilon_m) + (b_1 + b_2 \cdot W) \cdot \Delta\varepsilon$$

* $T_{b10}, T_{b11}$: Brightness temperatures of Band 10 and Band 11 ($\text{°C}$).
* $\varepsilon_m = \frac{\varepsilon_{10} + \varepsilon_{11}}{2}$ (Mean emissivity).
* $\Delta\varepsilon = \varepsilon_{10} - \varepsilon_{11}$ (Emissivity difference).
* $W$: Total atmospheric water vapor column.
* $c_0, c_1, c_2, a_1, a_2, b_1, b_2$: Empirical calibration constants.

#### 🧪 Example 1: Humid Summer Day Over Downtown
* **Given:** $T_{b10} = 35.0\text{°C}$, $T_{b11} = 33.2\text{°C}$, mean emissivity $\varepsilon_m = 0.970$, $\Delta\varepsilon = 0.004$, $W = 2.0\text{ g/cm}^2$.
* Constants: $c_1 = 1.35$, $c_2 = 0.18$, $c_0 = 0.25$, $(a_1 + a_2 W) = 22.0$, $(b_1 + b_2 W) = 110.0$.
1. Temperature difference: $T_{b10} - T_{b11} = 35.0 - 33.2 = 1.8\text{°C}$
2. First-order difference term: $1.35 \times 1.8 = 2.43$
3. Second-order difference term: $0.18 \times (1.8)^2 = 0.5832$
4. Emissivity mean deficit term: $22.0 \times (1 - 0.970) = 22.0 \times 0.030 = 0.66$
5. Emissivity delta term: $110.0 \times 0.004 = 0.44$
6. Sum all terms: $35.0 + 2.43 + 0.5832 + 0.25 + 0.66 + 0.44 = 39.3632\text{°C}$
* **Result:** Split-Window LST = $\mathbf{39.36\text{°C}}$.

#### 🧪 Example 2: Dry Air Over City Park
* **Given:** $T_{b10} = 22.0\text{°C}$, $T_{b11} = 21.1\text{°C}$, $\varepsilon_m = 0.988$, $\Delta\varepsilon = 0.001$, $W = 0.8\text{ g/cm}^2$.
* Constants: $c_1 = 1.35$, $c_2 = 0.18$, $c_0 = 0.25$, $(a_1 + a_2 W) = 12.0$, $(b_1 + b_2 W) = 60.0$.
1. Temperature difference: $22.0 - 21.1 = 0.9\text{°C}$
2. First-order term: $1.35 \times 0.9 = 1.215$
3. Second-order term: $0.18 \times (0.9)^2 = 0.1458$
4. Emissivity mean deficit term: $12.0 \times (1 - 0.988) = 12.0 \times 0.012 = 0.144$
5. Emissivity delta term: $60.0 \times 0.001 = 0.06$
6. Sum all terms: $22.0 + 1.215 + 0.1458 + 0.25 + 0.144 + 0.06 = 23.8148\text{°C}$
* **Result:** Split-Window LST = $\mathbf{23.81\text{°C}}$.

---

# 2. Graph Theory & Network Math

To treat a city as an interconnected spatial network, we model city blocks/neighborhoods as **Nodes ($V$)** and shared borders or road connections as **Edges ($E$)**.

```
  (Node 1: Downtown) ------ [Weight = 5.0] ------ (Node 2: Industrial)
          |                                               |
   [Weight = 2.0]                                  [Weight = 1.0]
          |                                               |
  (Node 3: Suburb A)  ------ [Weight = 4.0] ------ (Node 4: City Park)
```

---

### 2.1 Adjacency Matrix ($A$)

#### 💡 What is this in plain English?
An **Adjacency Matrix ($A$)** is a square grid lookup table that records connection strength (weight) between every pair of nodes. If two city blocks share a big border or highway, their connection weight is high. If they don't touch, the value is $0$.

#### 📐 The Math Formula
$$A_{ij} = \begin{cases} w_{ij} & \text{if node } i \text{ and } j \text{ are connected} \\ 0 & \text{otherwise} \end{cases}$$

#### 🧪 Example 1: 3-Neighborhood City Network
* **Nodes:** $N_1$ (Downtown), $N_2$ (Industrial), $N_3$ (Residential Suburb).
* Connections:
  * $N_1 \leftrightarrow N_2$: Heavy 4-lane thermal highway corridor ($w_{12} = 8$).
  * $N_1 \leftrightarrow N_3$: Residential arterial road ($w_{13} = 3$).
  * $N_2 \leftrightarrow N_3$: Separated by a river; no direct thermal connection ($w_{23} = 0$).

$$\mathbf{A} = \begin{bmatrix} 0 & 8 & 3 \\ 8 & 0 & 0 \\ 3 & 0 & 0 \end{bmatrix}$$

#### 🧪 Example 2: Adding a 4th Neighborhood (City Park)
* Node $N_4$ (Park) connects to $N_2$ (Industrial) with weight $1$ and $N_3$ (Residential Suburb) with weight $5$.

$$\mathbf{A} = \begin{bmatrix} 0 & 8 & 3 & 0 \\ 8 & 0 & 0 & 1 \\ 3 & 0 & 0 & 5 \\ 0 & 1 & 5 & 0 \end{bmatrix}$$

---

### 2.2 Degree Matrix ($D$)

#### 💡 What is this in plain English?
The **Degree Matrix ($D$)** is a diagonal matrix that sums up the total connection strength attached to each individual node. It represents how strongly connected a neighborhood is to its surrounding environment.

#### 📐 The Math Formula
$$D_{ii} = \sum_{j=1}^{n} A_{ij}, \quad D_{ij} = 0 \text{ for } i \neq j$$

#### 🧪 Example 1: Degree Matrix for the 3-Neighborhood City
Using Adjacency Matrix $A$ from Example 2.1:
* Row 1 ($N_1$): $0 + 8 + 3 = 11$
* Row 2 ($N_2$): $8 + 0 + 0 = 8$
* Row 3 ($N_3$): $3 + 0 + 0 = 3$

$$\mathbf{D} = \begin{bmatrix} 11 & 0 & 0 \\ 0 & 8 & 0 \\ 0 & 0 & 3 \end{bmatrix}$$

#### 🧪 Example 2: Degree Matrix for the 4-Neighborhood City
Using Adjacency Matrix $A$ from Example 2.2:
* Row 1 ($N_1$): $0 + 8 + 3 + 0 = 11$
* Row 2 ($N_2$): $8 + 0 + 0 + 1 = 9$
* Row 3 ($N_3$): $3 + 0 + 0 + 5 = 8$
* Row 4 ($N_4$): $0 + 1 + 5 + 0 = 6$

$$\mathbf{D} = \begin{bmatrix} 11 & 0 & 0 & 0 \\ 0 & 9 & 0 & 0 \\ 0 & 0 & 8 & 0 \\ 0 & 0 & 0 & 6 \end{bmatrix}$$

---

### 2.3 Unnormalized Graph Laplacian ($L = D - A$)

#### 💡 What is this in plain English?
The **Graph Laplacian ($L$)** measures how energy, heat, or traffic flows across a network. It acts like a discrete version of the second derivative (diffusion operator). Subtracting the adjacency matrix from the degree matrix ($L = D - A$) tells us how much a neighborhood differs from the average of its immediate neighbors.

#### 📐 The Math Formula
$$\mathbf{L} = \mathbf{D} - \mathbf{A}$$

#### 🧪 Example 1: Unnormalized Laplacian for the 3-Neighborhood City
1. $\mathbf{D} = \begin{bmatrix} 11 & 0 & 0 \\ 0 & 8 & 0 \\ 0 & 0 & 3 \end{bmatrix}$
2. $\mathbf{A} = \begin{bmatrix} 0 & 8 & 3 \\ 8 & 0 & 0 \\ 3 & 0 & 0 \end{bmatrix}$
3. Subtract $\mathbf{D} - \mathbf{A}$:

$$\mathbf{L} = \begin{bmatrix} 11 - 0 & 0 - 8 & 0 - 3 \\ 0 - 8 & 8 - 0 & 0 - 0 \\ 0 - 0 & 0 - 0 & 3 - 0 \end{bmatrix} = \begin{bmatrix} 11 & -8 & -3 \\ -8 & 8 & 0 \\ -3 & 0 & 3 \end{bmatrix}$$

*(Notice how every row sum equals 0!)*

#### 🧪 Example 2: Unnormalized Laplacian for the 4-Neighborhood City
1. $\mathbf{D} = \begin{bmatrix} 11 & 0 & 0 & 0 \\ 0 & 9 & 0 & 0 \\ 0 & 0 & 8 & 0 \\ 0 & 0 & 0 & 6 \end{bmatrix}$
2. $\mathbf{A} = \begin{bmatrix} 0 & 8 & 3 & 0 \\ 8 & 0 & 0 & 1 \\ 3 & 0 & 0 & 5 \\ 0 & 1 & 5 & 0 \end{bmatrix}$
3. Subtract $\mathbf{D} - \mathbf{A}$:

$$\mathbf{L} = \begin{bmatrix} 11 & -8 & -3 & 0 \\ -8 & 9 & 0 & -1 \\ -3 & 0 & 8 & -5 \\ 0 & -1 & -5 & 6 \end{bmatrix}$$

---

### 2.4 Symmetric Normalized Graph Laplacian ($L_{\text{sym}}$)

#### 💡 What is this in plain English?
In real cities, a huge downtown central node with dozens of connections can dominate simple Laplacian calculations compared to a small quiet suburban node. The **Symmetric Normalized Graph Laplacian ($L_{\text{sym}}$)** scales every connection by the relative size of the nodes it links, making it fair across big and small neighborhoods.

#### 📐 The Math Formula
$$\mathbf{L}_{\text{sym}} = \mathbf{D}^{-1/2} \mathbf{L} \mathbf{D}^{-1/2} = \mathbf{I} - \mathbf{D}^{-1/2} \mathbf{A} \mathbf{D}^{-1/2}$$

#### 🧪 Example 1: Two Connected Neighborhoods of Unequal Size
* $N_1$ (Big hub, Degree $D_{11} = 16$), $N_2$ (Small neighborhood, Degree $D_{22} = 4$).
* Connection weight $w_{12} = 4$.
1. Compute degree square root inverse:
   * $D_{11}^{-1/2} = 1/\sqrt{16} = 0.25$
   * $D_{22}^{-1/2} = 1/\sqrt{4} = 0.50$
2. Compute off-diagonal element for $L_{\text{sym}(1,2)}$:
   * $L_{\text{sym}(1,2)} = - D_{11}^{-1/2} \cdot A_{12} \cdot D_{22}^{-1/2} = -(0.25) \times 4 \times (0.50) = -0.50$
3. On diagonal elements are always $1.0$:

$$\mathbf{L}_{\text{sym}} = \begin{bmatrix} 1.0 & -0.50 \\ -0.50 & 1.0 \end{bmatrix}$$

#### 🧪 Example 2: Two Connected Equal-Sized Neighborhoods
* $N_1$ (Degree $D_{11} = 9$), $N_2$ (Degree $D_{22} = 9$). Connection weight $w_{12} = 9$.
1. $D_{11}^{-1/2} = 1/\sqrt{9} = 0.3333$
2. $D_{22}^{-1/2} = 1/\sqrt{9} = 0.3333$
3. Off-diagonal element: $-(0.3333) \times 9 \times (0.3333) = -1.0$

$$\mathbf{L}_{\text{sym}} = \begin{bmatrix} 1.0 & -1.0 \\ -1.0 & 1.0 \end{bmatrix}$$

---

# 3. Spectral Graph Theory & Clustering

---

### 3.1 Fiedler Vector & Fiedler Value ($\lambda_2$)

#### 💡 What is this in plain English?
When you perform eigenvalue decomposition on a Graph Laplacian matrix ($L$), the smallest eigenvalue ($\lambda_1$) is always $0$. The **second smallest eigenvalue ($\lambda_2$)** is called the **Fiedler Value** or *algebraic connectivity*. 

* If $\lambda_2 = 0$, the city network is completely split into two separate islands with no connecting roads.
* The eigenvector corresponding to $\lambda_2$ is the **Fiedler Vector**. Its positive vs. negative values show the cleanest line to slice a city into two distinct thermal zones.

#### 📐 The Math Formula
$$\mathbf{L} \mathbf{v}_2 = \lambda_2 \mathbf{v}_2$$

#### 🧪 Example 1: Slicing a 4-Node Linear City Graph
Suppose a line of 4 neighborhoods has Laplacian matrix eigenvectors with second smallest eigenvalue $\lambda_2 = 0.586$. Its Fiedler vector is:
$$\mathbf{v}_2 = [-0.63, -0.32, +0.32, +0.63]^T$$
1. Look at sign of entries:
   * $N_1 (-0.63)$ and $N_2 (-0.32)$ are **Negative**.
   * $N_3 (+0.32)$ and $N_4 (+0.63)$ are **Positive**.
* **Result:** Slicing the city between $N_2$ and $N_3$ creates the most natural, balanced network cut.

#### 🧪 Example 2: Highly Connected Mesh City
In a highly connected grid city, $\lambda_2 = 2.45$. Because $\lambda_2$ is large ($>0$), the city is strongly interconnected and resistant to being split by thermal barriers.

---

### 3.2 Cheeger Constant ($\text{h}(G)$ / Isoperimetric Constant)

#### 💡 What is this in plain English?
The **Cheeger Constant ($\text{h}(G)$)** measures the bottleneck strength of a network. It asks: *"What is the absolute smallest ratio of boundary road connections you have to cut relative to the total size of the sub-district created?"* A low Cheeger constant means a city has a clear bottleneck where heat or traffic gets trapped.

#### 📐 The Math Formula
$$\text{h}(G) = \min_{S \subset V} \frac{|\partial S|}{\min(\text{vol}(S), \text{vol}(V \setminus S))}$$

* $|\partial S|$: Sum of edge weights crossing the cut boundary.
* $\text{vol}(S)$: Sum of degrees of nodes in set $S$.

#### 🧪 Example 1: Two Clusters Connected by One Narrow Bridge
* Cluster $A$ has internal volume $\text{vol}(A) = 50$.
* Cluster $B$ has internal volume $\text{vol}(B) = 50$.
* The two clusters are connected by 1 bridge with weight $|\partial S| = 2$.
1. Ratio = $\frac{2}{\min(50, 50)} = \frac{2}{50} = 0.04$
* **Result:** $\text{h}(G) = \mathbf{0.04}$ (Extremely strong bottleneck).

#### 🧪 Example 2: Dense Urban Ring Road
* District $S$ has volume $\text{vol}(S) = 40$. Remaining city has volume $80$.
* District $S$ is connected to the city by 5 multi-lane roads with total weight $|\partial S| = 20$.
1. Ratio = $\frac{20}{\min(40, 80)} = \frac{20}{40} = 0.50$
* **Result:** $\text{h}(G) = \mathbf{0.50}$ (High connectivity, weak bottleneck).

---

### 3.3 Cheeger Cut & Cheeger Inequality

#### 💡 What is this in plain English?
Finding the exact Cheeger Cut (the worst bottleneck in a massive city graph) is computationally impossible for large networks (NP-hard). **Cheeger's Inequality** guarantees that we can use the simple Fiedler value ($\lambda_2$) from Step 3.1 to approximate the bottleneck size without brute force searching.

#### 📐 The Math Formula
$$\frac{\lambda_2}{2} \le \text{h}(G) \le \sqrt{2 \lambda_2}$$

#### 🧪 Example 1: Tight Bottleneck Network ($\lambda_2 = 0.08$)
1. Lower Bound: $0.08 / 2 = 0.04$
2. Upper Bound: $\sqrt{2 \times 0.08} = \sqrt{0.16} = 0.40$
* **Result:** The true network bottleneck constant $\text{h}(G)$ is mathematically bounded between $\mathbf{0.04}$ and $\mathbf{0.40}$.

#### 🧪 Example 2: Well-Mixed Grid Network ($\lambda_2 = 1.28$)
1. Lower Bound: $1.28 / 2 = 0.64$
2. Upper Bound: $\sqrt{2 \times 1.28} = \sqrt{2.56} = 1.60$
* **Result:** The bottleneck metric $\text{h}(G)$ is guaranteed to sit between $\mathbf{0.64}$ and $\mathbf{1.60}$.

---

### 3.4 Spectral Clustering Algorithm

#### 💡 What is this in plain English?
Instead of clustering neighborhoods based purely on geographic coordinates ($x, y$), **Spectral Clustering** projects complex non-linear spatial graph shapes into a low-dimensional "eigenvector space" using the Graph Laplacian matrix, where standard algorithms like $k$-Means can easily group distinct thermal micro-climates.

#### 📐 Step-by-Step Mathematical Workflow
1. Build Adjacency Matrix $A$ and Symmetric Laplacian $L_{\text{sym}}$.
2. Compute the $k$ smallest eigenvectors $\mathbf{v}_1, \mathbf{v}_2, \dots, \mathbf{v}_k$.
3. Form matrix $U \in \mathbb{R}^{n \times k}$ with these eigenvectors as columns.
4. Normalize rows of $U$ to unit length.
5. Cluster row vectors into $k$ groups using standard $k$-Means clustering.

#### 🧪 Example 1: Grouping 3 Neighborhoods Into 2 Thermal Zones
* Neighborhoods $N_1, N_2, N_3$ yield 2-dimensional eigenvector coordinate rows:
  * $N_1$: $(-0.707, 0.120)$
  * $N_2$: $(-0.690, 0.140)$
  * $N_3$: $(0.710, -0.050)$
1. Measure Euclidean distance between $N_1$ and $N_2$: $\sqrt{(-0.707 - -0.690)^2 + (0.120 - 0.140)^2} = \sqrt{0.000289 + 0.0004} = 0.026$ (Close!).
2. Measure distance between $N_1$ and $N_3$: $\sqrt{(-0.707 - 0.710)^2 + (0.120 - -0.050)^2} = \sqrt{2.0078 + 0.0289} = 1.427$ (Far!).
* **Result:** Cluster Group 1 = $\{N_1, N_2\}$ (Cool residential zone), Cluster Group 2 = $\{N_3\}$ (Hot industrial zone).

#### 🧪 Example 2: Delineating an Urban Cool Island
* Matrix rows for a central park ($N_{\text{park}}$) vs surrounding asphalt blocks ($N_{\text{asp1}}, N_{\text{asp2}}$):
  * $N_{\text{park}} = (0.01, 0.99)$
  * $N_{\text{asp1}} = (0.85, 0.02)$
  * $N_{\text{asp2}} = (0.88, 0.01)$
* **Result:** Spectral clustering isolates the park into its own distinct thermal cluster.

---

### 3.5 Modularity ($Q$) & Graph Partitioning

#### 💡 What is this in plain English?
**Modularity ($Q$)** evaluates the quality of a city partition. It compares the number of connections *inside* detected thermal zones against what would be expected purely by random chance.
* $Q > 0.3$: Strong, meaningful district boundaries.
* $Q \approx 0$: No better than a random division.

#### 📐 The Math Formula
$$Q = \frac{1}{2m} \sum_{i,j} \left( A_{ij} - \frac{k_i k_j}{2m} \right) \delta(c_i, c_j)$$

* $m$: Total weight of all edges in graph.
* $k_i, k_j$: Degrees of nodes $i$ and $j$.
* $\delta(c_i, c_j) = 1$ if $i$ and $j$ belong to the same cluster, else $0$.

#### 🧪 Example 1: Well-Separated Industrial vs Park Districts
* Total graph edge weight $m = 20$.
* Inside proposed Cluster 1 ($N_1, N_2$): $A_{12} = 8$, degrees $k_1 = 10, k_2 = 10$.
1. Expected weight by chance: $\frac{10 \times 10}{2 \times 20} = \frac{100}{40} = 2.5$
2. Actual minus expected: $8 - 2.5 = 5.5$
3. Normalize by $2m = 40$: $5.5 / 40 = 0.1375$ (From a single internal pair).
* **Result:** Summing across all pairs yields $Q = \mathbf{0.48}$ (High modularity cut!).

#### 🧪 Example 2: Arbitrary Grid Partition
* Actual internal edge weight $= 3$. Expected by chance $= 2.8$.
1. Actual minus expected: $3 - 2.8 = 0.2$
2. Normalized: $0.2 / 40 = 0.005$
* **Result:** Summing across all pairs yields $Q = \mathbf{0.02}$ (Poor partition).

---

# 4. Probability, Statistics & Spatial Risk Modeling

---

### 4.1 Global Moran's I (Spatial Autocorrelation)

#### 💡 What is this in plain English?
**Global Moran's I** measures spatial autocorrelation across an entire city: *Are hot neighborhoods grouped together next to other hot neighborhoods, or is heat randomly scattered like a chessboard?*
* $+1.0$: Highly clustered (Hotspots next to hotspots, cool spots next to cool spots).
* $0.0$: Perfectly random spatial distribution.
* $-1.0$: Checkerboard pattern.

#### 📐 The Math Formula
$$I = \frac{N}{S_0} \frac{\sum_{i=1}^N \sum_{j=1}^N w_{ij} (x_i - \bar{x})(x_j - \bar{x})}{\sum_{i=1}^N (x_i - \bar{x})^2}$$

* $N$: Total number of spatial units.
* $x_i$: LST of neighborhood $i$.
* $\bar{x}$: Mean LST across city.
* $w_{ij}$: Spatial weight between $i$ and $j$.
* $S_0 = \sum_{i} \sum_{j} w_{ij}$.

#### 🧪 Example 1: Clustered Urban Heat
* $N = 3$, City Mean $\bar{x} = 30\text{°C}$, $S_0 = 2$.
* Temperatures: $x_1 = 36\text{°C}$, $x_2 = 34\text{°C}$, $x_3 = 20\text{°C}$.
* Weight matrix: $w_{12} = 1, w_{21} = 1$, others $0$.
1. Anomaly products:
   * Neighbor pair $(1,2)$: $(36-30)(34-30) \times 1 = (+6)(+4) = 24$
   * Neighbor pair $(2,1)$: $(34-30)(36-30) \times 1 = (+4)(+6) = 24$
   * Total Numerator Sum = $48$
2. Denominator sum of squared deviations: $(36-30)^2 + (34-30)^2 + (20-30)^2 = 36 + 16 + 100 = 152$
3. Compute $I$: $\left(\frac{3}{2}\right) \times \left(\frac{48}{152}\right) = 1.5 \times 0.3158 = 0.4737$
* **Result:** Moran's $I = \mathbf{+0.474}$ (Strong spatial heat clustering).

#### 🧪 Example 2: Uniform Mixed Spatial Temperatures
* Temperatures: $x_1 = 36\text{°C}$, $x_2 = 20\text{°C}$, $x_3 = 34\text{°C}$.
* Anomaly products for neighbor pair $(1,2)$: $(36-30)(20-30) = (+6)(-10) = -60$.
* **Result:** Moran's $I = \mathbf{-0.592}$ (Strong dispersion / anti-clustering).

---

### 4.2 Local Moran's I (LISA / Spot Detection)

#### 💡 What is this in plain English?
While Global Moran's I gives one single score for the whole city, **Local Moran's I ($I_i$)** evaluates every individual neighborhood to pinpoint exact geographic anomalies:
* **High-High (Hotspot):** Hot block surrounded by hot blocks.
* **Low-Low (Coldspot):** Cool park surrounded by cool blocks.
* **High-Low (Outlier):** Hot parking garage isolated inside a cool forest.

#### 📐 The Math Formula
$$I_i = \frac{x_i - \bar{x}}{s^2} \sum_{j=1}^N w_{ij} (x_j - \bar{x})$$

* $s^2$: Variance of LST across all pixels.

#### 🧪 Example 1: Industrial Warehouse ($x_i = 38\text{°C}$, $\bar{x} = 30\text{°C}$, $s^2 = 16$)
* Neighboring blocks average temperature anomaly $\sum w_{ij}(x_j - \bar{x}) = +6\text{°C}$.
1. Standardized target node: $(38 - 30) / 16 = 8 / 16 = 0.50$
2. Multiply by neighbor anomaly: $0.50 \times (+6) = +3.0$
* **Result:** $I_i = \mathbf{+3.0}$ (**High-High Hotspot**).

#### 🧪 Example 2: Cool Park in Industrial Zone ($x_i = 22\text{°C}$, $\bar{x} = 30\text{°C}$, $s^2 = 16$)
* Surrounded by hot industrial neighbors with anomaly $+6\text{°C}$.
1. Standardized target node: $(22 - 30) / 16 = -8 / 16 = -0.50$
2. Multiply by neighbor anomaly: $-0.50 \times (+6) = -3.0$
* **Result:** $I_i = \mathbf{-3.0}$ (**Low-High Spatial Outlier**).

---

### 4.3 Probability Density Functions (PDFs) for Heat Waves

#### 💡 What is this in plain English?
A **Probability Density Function (PDF)** models the statistical distribution of summer temperatures across a city. The area under the curve gives the probability that a random summer day will exceed a dangerous heat safety threshold (e.g., $>38\text{°C}$).

#### 📐 The Math Formula (Gaussian PDF)
$$f(x) = \frac{1}{\sigma \sqrt{2\pi}} e^{-\frac{1}{2}\left(\frac{x - \mu}{\sigma}\right)^2}$$

* $\mu$: Mean summer temperature.
* $\sigma$: Standard deviation.

#### 🧪 Example 1: Normal Summer Day ($x = 35\text{°C}$, $\mu = 30\text{°C}$, $\sigma = 2.5\text{°C}$)
1. $z$-score: $(35 - 30) / 2.5 = 2.0$
2. Exponent: $-\frac{1}{2}(2.0)^2 = -2.0$
3. Exponential value: $e^{-2.0} = 0.1353$
4. Constant scaling: $\frac{1}{2.5 \sqrt{2\pi}} = \frac{1}{2.5 \times 2.5066} = \frac{1}{6.2665} = 0.1596$
5. Product: $0.1596 \times 0.1353 = 0.0216$
* **Result:** PDF Density value $f(35) = \mathbf{0.0216}$.

#### 🧪 Example 2: Average Summer Day ($x = 30\text{°C}$, $\mu = 30\text{°C}$, $\sigma = 2.5\text{°C}$)
1. $z$-score: $(30 - 30) / 2.5 = 0$
2. Exponent: $e^0 = 1.0$
3. Product: $0.1596 \times 1.0 = 0.1596$
* **Result:** PDF Density value $f(30) = \mathbf{0.1596}$ (Peak probability density).

---

### 4.4 Joint & Conditional Probabilities of Thermal Vulnerability

#### 💡 What is this in plain English?
* **Joint Probability $P(A \cap B)$:** The chance that two conditions happen at the *same time* (e.g., a neighborhood is both extremely hot AND has a high elderly population).
* **Conditional Probability $P(A \mid B)$:** The probability that a neighborhood is extremely hot *given that* we already know it has low tree canopy cover.

#### 📐 The Math Formulas
$$P(A \cap B) = P(A \mid B) \cdot P(B)$$
$$P(A \mid B) = \frac{P(A \cap B)}{P(B)}$$

#### 🧪 Example 1: Calculating Joint Vulnerability Risk
* Probability a district has high elderly pop $P(\text{Elderly}) = 0.20$.
* Probability a district is hot given high elderly pop $P(\text{Hot} \mid \text{Elderly}) = 0.45$.
1. Joint Risk: $P(\text{Hot} \cap \text{Elderly}) = 0.45 \times 0.20 = 0.09$
* **Result:** $9\%$ of all city districts face simultaneous high heat and high elderly vulnerability.

#### 🧪 Example 2: Conditional Heat Risk Given Low Tree Canopy
* Out of 100 city blocks, 30 blocks have low tree canopy ($P(\text{Low Tree}) = 0.30$).
* 21 blocks have both low tree canopy and experience extreme heat ($P(\text{Hot} \cap \text{Low Tree}) = 0.21$).
1. Conditional Risk: $P(\text{Hot} \mid \text{Low Tree}) = \frac{0.21}{0.30} = 0.70$
* **Result:** There is a $\mathbf{70\%}$ chance a block will suffer extreme heat if its tree canopy is low.

---

### 4.5 Markov Chains & Land-Use Transition Matrices

#### 💡 What is this in plain English?
A **Markov Chain** models how urban land cover transitions over time (e.g., from 2020 to 2030). A **Transition Matrix ($P$)** defines the probabilities of a pixel changing from Vegetation ($V$) or Soil ($S$) into Concrete ($C$) during the next decade.

#### 📐 The Math Formula
$$\mathbf{x}^{(t+1)} = \mathbf{x}^{(t)} \cdot \mathbf{P}$$

* $\mathbf{x}^{(t)}$: State distribution vector at decade $t$.
* $\mathbf{P}$: Transition matrix where rows sum to $1.0$.

#### 🧪 Example 1: Predicting 2030 Land Cover
* **2020 State:** $60\%$ Green Space ($V$), $40\%$ Concrete ($C$) $\rightarrow \mathbf{x}^{(2020)} = [0.60, 0.40]$.
* **Transition Matrix $\mathbf{P}$:**
  $$\mathbf{P} = \begin{bmatrix} 0.80 & 0.20 \\ 0.05 & 0.95 \end{bmatrix}$$
  *(80% of green stays green, 20% becomes concrete; 5% of concrete converted to green, 95% stays concrete).*
1. Multiply vector by matrix:
   * New Green: $(0.60 \times 0.80) + (0.40 \times 0.05) = 0.48 + 0.02 = 0.50$
   * New Concrete: $(0.60 \times 0.20) + (0.40 \times 0.95) = 0.12 + 0.38 = 0.50$
* **Result:** By 2030, land cover shifts to $\mathbf{50\%}$ Green and $\mathbf{50\%}$ Concrete.

#### 🧪 Example 2: Predicting 2040 Land Cover (2 Steps Ahead)
* **2030 State:** $\mathbf{x}^{(2030)} = [0.50, 0.50]$.
1. Multiply vector by matrix $\mathbf{P}$:
   * New Green: $(0.50 \times 0.80) + (0.50 \times 0.05) = 0.40 + 0.025 = 0.425$
   * New Concrete: $(0.50 \times 0.20) + (0.50 \times 0.95) = 0.10 + 0.475 = 0.575$
* **Result:** By 2040, green cover drops further to $\mathbf{42.5\%}$, and concrete rises to $\mathbf{57.5\%}$.

---

### 4.6 Extreme Value Theory (Generalized Extreme Value / GEV Distribution)

#### 💡 What is this in plain English?
Standard statistics focuses on average temperatures. But extreme heatwaves kill people. **Extreme Value Theory (EVT)** uses the **GEV Distribution** to calculate the probability of rare, severe heat waves (e.g., a "1-in-100-year" extreme temperature event).

#### 📐 The Math Formula (Cumulative Distribution Function)
$$F(x; \mu, \sigma, \xi) = \exp\left( -\left[ 1 + \xi \left( \frac{x - \mu}{\sigma} \right) \right]^{-1/\xi} \right)$$

* $\mu$: Location parameter (center of extreme annual maximums).
* $\sigma$: Scale parameter (spread of extreme values).
* $\xi$: Shape parameter (determines tail heavy-ness: Fréchet $\xi > 0$, Gumbel $\xi = 0$, Weibull $\xi < 0$).

#### 🧪 Example 1: 100-Year Heatwave Projection ($\xi = 0.1$, $\mu = 38\text{°C}$, $\sigma = 2.0\text{°C}$, $x = 44\text{°C}$)
1. Normalized deviation: $(44 - 38) / 2.0 = 3.0$
2. Shape term: $1 + 0.1 \times (3.0) = 1 + 0.3 = 1.3$
3. Exponent power: $-1 / 0.1 = -10$
4. Outer bracket: $(1.3)^{-10} = 0.07257$
5. Exponential: $\exp(-0.07257) = 0.92999$
6. Return period probability ($1 - F(x)$): $1 - 0.92999 = 0.07001$
* **Result:** There is a $\mathbf{7.0\%}$ annual chance of exceeding $44\text{°C}$ in any given year.

#### 🧪 Example 2: Severe Extreme Event ($x = 47\text{°C}$)
1. Normalized deviation: $(47 - 38) / 2.0 = 4.5$
2. Shape term: $1 + 0.1 \times (4.5) = 1.45$
3. Outer bracket: $(1.45)^{-10} = 0.02434$
4. Exponential: $\exp(-0.02434) = 0.97595$
5. Return period probability: $1 - 0.97595 = 0.02405$
* **Result:** Annual probability of exceeding $47\text{°C}$ is $\mathbf{2.4\%}$ (a $\sim 1$-in-$41$ year heatwave).

---

### 4.7 Risk & Population Exposure Modeling

#### 💡 What is this in plain English?
A high land surface temperature in an empty desert is low risk. Extreme heat in a densely populated neighborhood with no air conditioning is a severe public health crisis. **Thermal Risk ($R$)** is calculated by multiplying **Hazard ($H$)**, **Exposure ($E$)**, and **Vulnerability ($V$)**.

#### 📐 The Math Formula
$$R = H \times E \times V$$

* $H$: Heat Hazard index ($0.0 - 1.0$, based on LST anomaly).
* $E$: Exposure index ($0.0 - 1.0$, population density).
* $V$: Vulnerability index ($0.0 - 1.0$, poverty rate, age $>65$, lack of tree shade).

#### 🧪 Example 1: Low-Income High-Density High-Heat Block
* Hazard score $H = 0.90$ ($39\text{°C}$ ground temperature).
* Exposure score $E = 0.85$ ($12,000$ residents per $\text{km}^2$).
* Vulnerability score $V = 0.80$ (High elderly pop, low AC access).
1. Multiply components: $R = 0.90 \times 0.85 \times 0.80 = 0.612$
* **Result:** Thermal Risk Score $R = \mathbf{0.612}$ (**Critical priority intervention zone**).

#### 🧪 Example 2: Wealthy Forested Suburb
* Hazard score $H = 0.30$ ($26\text{°C}$ ground temperature).
* Exposure score $E = 0.20$ ($800$ residents per $\text{km}^2$).
* Vulnerability score $V = 0.15$ (High income, 100% AC access).
1. Multiply components: $R = 0.30 \times 0.20 \times 0.15 = 0.009$
* **Result:** Thermal Risk Score $R = \mathbf{0.009}$ (Minimal risk).

---

# 5. Combinatorics & Graph Optimization

---

### 5.1 Combinatorial Graph Cuts

#### 💡 What is this in plain English?
A **Graph Cut** partitions the set of city blocks into two distinct mathematical groups ($S$ and $T$). The **Cut Weight** is the exact combinatorial sum of edge weights connecting nodes in $S$ to nodes in $T$.

#### 📐 The Math Formula
$$\text{Cut}(S, T) = \sum_{i \in S, j \in T} w_{ij}$$

#### 🧪 Example 1: Cutting Highway Connections Between 2 Zones
* Set $S = \{\text{Downtown}, \text{Financial District}\}$.
* Set $T = \{\text{Suburbs}, \text{Airport}\}$.
* Road connections crossing from $S$ to $T$:
  * Main Expressway ($w_{13} = 12$)
  * Secondary Arterial ($w_{24} = 4$)
1. Sum edge weights: $12 + 4 = 16$
* **Result:** $\text{Cut}(S, T) = \mathbf{16}$.

#### 🧪 Example 2: Cutting a Low-Traffic Rural Boundary
* Set $S = \{\text{Village A}, \text{Village B}\}$.
* Set $T = \{\text{City Core}\}$.
* Only 1 narrow dirt road connects them ($w_{12} = 1.5$).
1. Sum edge weights: $1.5$
* **Result:** $\text{Cut}(S, T) = \mathbf{1.5}$.

---

### 5.2 Minimum Cut / Maximum Flow Algorithm

#### 💡 What is this in plain English?
The **Ford-Fulkerson / Max-Flow Min-Cut Theorem** states that the maximum amount of heat diffusion or traffic flow that can pass through a city network from a Source ($S$) to a Sink ($T$) is exactly equal to the total weight of the smallest bottleneck cut (**Minimum Cut**).

```
[ Source S: Industrial Heat Center ] == (Cap: 10) ==> [ Node A ] == (Cap: 7) ==> [ Sink T: Cool Park ]
                                     == (Cap: 5)  ==> [ Node B ] == (Cap: 4) ==> [ Sink T: Cool Park ]
```

#### 📐 The Math Formula
$$\text{MaxFlow}(S \to T) = \min_{S, T \text{ partitions}} \text{Cut}(S, T)$$

#### 🧪 Example 1: Heat Diffusion Bottleneck
* From Source $S$ (Industrial District):
  * Pipe 1 to Node $A$ has capacity $10$. Pipe 2 to Node $B$ has capacity $5$.
* From intermediate nodes to Sink $T$ (Cool River District):
  * Node $A \to T$ has capacity $7$.
  * Node $B \to T$ has capacity $4$.
1. Max flow through path $S \to A \to T = \min(10, 7) = 7$.
2. Max flow through path $S \to B \to T = \min(5, 4) = 4$.
3. Total Max Flow = $7 + 4 = 11$.
* **Result:** The **Minimum Cut** restricting thermal diffusion is equal to $\mathbf{11}$.

#### 🧪 Example 2: Upgrading a Road Bottleneck
* If Node $B \to T$ capacity is upgraded from $4$ to $8$:
1. Flow through $S \to B \to T = \min(5, 8) = 5$.
2. Total Max Flow = $7 + 5 = 12$.
* **Result:** Network capacity rises to $\mathbf{12}$, bounded by the capacity of link $S \to B$.

---

### 5.3 Permutations & Combinations for Spatial Subgraphs

#### 💡 What is this in plain English?
* **Combinations $\binom{n}{k}$:** How many unique ways can we select $k$ city blocks out of $n$ total blocks to install urban cooling centers (where order doesn't matter)?
* **Permutations $P(n, k)$:** How many unique ordered routes can an inspection team take to visit $k$ out of $n$ priority hotspots?

#### 📐 The Math Formulas
$$\text{Combinations: } \binom{n}{k} = \frac{n!}{k!(n - k)!}$$
$$\text{Permutations: } P(n, k) = \frac{n!}{(n - k)!}$$

#### 🧪 Example 1: Choosing 3 Neighborhoods for Cooling Infrastructure
* Out of $n = 8$ candidate heat-vulnerable neighborhoods, we have budget to fund $k = 3$ cooling centers.
1. Factorials: $8! = 40,320$; $3! = 6$; $(8-3)! = 5! = 120$.
2. Combinations: $\frac{40,320}{6 \times 120} = \frac{40,320}{720} = 56$
* **Result:** There are $\mathbf{56}$ unique combinations of neighborhoods to receive cooling centers.

#### 🧪 Example 2: Ordering a 3-Stop Emergency Inspection Route
* An inspector must visit $k = 3$ out of $n = 8$ hotspot sites in a specific sequence.
1. Permutations: $\frac{8!}{(8-3)!} = \frac{40,320}{120} = 336$
* **Result:** There are $\mathbf{336}$ distinct ordered inspection routes.

---

### 5.4 NP-Hard Partitioning & Greedy Heuristics

#### 💡 What is this in plain English?
Finding the absolute mathematically optimal way to split a large city with $N = 1000$ blocks into balanced thermal districts is **NP-Hard**—it would take a supercomputer millions of years to check every possibility ($2^{1000}$ combinations). 

Instead, we use **Greedy Optimization Heuristics** (like the Kernighan-Lin algorithm or Greedy Modularity Maximization) that make locally optimal choices at each step to reach a near-optimal solution in seconds.

#### 📐 Step-by-Step Greedy Heuristic Algorithm
1. Start with every node in its own tiny district cluster.
2. Calculate the Modularity Gain ($\Delta Q$) for merging every neighboring pair of clusters.
3. Merge the specific pair that yields the largest positive increase in modularity ($\Delta Q > 0$).
4. Repeat steps 2–3 until no merge can increase modularity further.

#### 🧪 Example 1: Greedy Merge of 3 Districts
Current clusters: $C_1, C_2, C_3$.
* Potential merges:
  * Merge $(C_1, C_2) \rightarrow \Delta Q = +0.12$
  * Merge $(C_1, C_3) \rightarrow \Delta Q = +0.03$
  * Merge $(C_2, C_3) \rightarrow \Delta Q = -0.05$
1. The greedy algorithm selects merge $(C_1, C_2)$ because $+0.12$ is the highest gain.
* **Result:** New cluster formed $\{C_1, C_2\}$ in step 1.

#### 🧪 Example 2: Stopping Condition Reached
Remaining clusters: $C_{12}, C_3$.
* Potential merge $(C_{12}, C_3) \rightarrow \Delta Q = -0.08$.
1. Because $\Delta Q < 0$, merging decreases graph partition quality.
* **Result:** Greedy algorithm halts and returns final partition $\{C_{12}\}$ and $\{C_3\}$.