# Cube Coordinate System Reference

The 3x3x3 cube grid uses indices 0-26, with coordinates (x, y, z) where each axis ranges from -1 to 1.

## Index Mapping

| Index | X  | Y  | Z  | Position Description |
|-------|----|----|----|--------------------|
| 0     | -1 | -1 | -1 | Back-Bottom-Left   |
| 1     | -1 | -1 | 0  | Middle-Bottom-Left |
| 2     | -1 | -1 | 1  | Front-Bottom-Left  |
| 3     | -1 | 0  | -1 | Back-Middle-Left   |
| 4     | -1 | 0  | 0  | Middle-Middle-Left |
| 5     | -1 | 0  | 1  | Front-Middle-Left  |
| 6     | -1 | 1  | -1 | Back-Top-Left      |
| 7     | -1 | 1  | 0  | Middle-Top-Left    |
| 8     | -1 | 1  | 1  | Front-Top-Left     |
| 9     | 0  | -1 | -1 | Back-Bottom-Center |
| 10    | 0  | -1 | 0  | Middle-Bottom-Center |
| 11    | 0  | -1 | 1  | Front-Bottom-Center |
| 12    | 0  | 0  | -1 | Back-Middle-Center |
| **13**| **0** | **0** | **0** | **CENTER (Middle-Middle-Center)** |
| 14    | 0  | 0  | 1  | Front-Middle-Center |
| 15    | 0  | 1  | -1 | Back-Top-Center    |
| 16    | 0  | 1  | 0  | Middle-Top-Center  |
| 17    | 0  | 1  | 1  | Front-Top-Center   |
| 18    | 1  | -1 | -1 | Back-Bottom-Right  |
| 19    | 1  | -1 | 0  | Middle-Bottom-Right |
| 20    | 1  | -1 | 1  | Front-Bottom-Right |
| 21    | 1  | 0  | -1 | Back-Middle-Right  |
| 22    | 1  | 0  | 0  | Middle-Middle-Right |
| 23    | 1  | 0  | 1  | Front-Middle-Right |
| 24    | 1  | 1  | -1 | Back-Top-Right     |
| 25    | 1  | 1  | 0  | Middle-Top-Right   |
| 26    | 1  | 1  | 1  | Front-Top-Right    |

## Axis Interpretation
- **X axis**: -1 (Left) → 0 (Center) → 1 (Right) [Income: Low → Medium → High]
- **Y axis**: -1 (Bottom) → 0 (Middle) → 1 (Top) [Age: Young → Middle → Senior]
- **Z axis**: -1 (Back) → 0 (Middle) → 1 (Front) [Household: Single → Couple → Family]

## Tetris Shapes (4 cubes each)

### Shape 1: L-Piece (Bottom Layer)
Indices: [9, 10, 19, 18]
```
Bottom layer view (Y=-1):
  Z
  ↑
-1| X - -
 0| X - -
 1| - - -
  +------→ X
   -1 0 1
```

### Shape 2: T-Piece (Middle Layer)
Indices: [12, 13, 14, 16]
```
Middle layer view (Y=0):
  Z
  ↑
-1| X - -
 0| X X -
 1| X - -
  +------→ X
   -1 0 1
```

### Shape 3: Vertical Line
Indices: [4, 7, 10, 13]
```
Side view (X=-1 and X=0):
  Y
  ↑
 1| X - -
 0| X - -
-1| - X -
  +------→ Z
   -1 0 1
```

### Shape 4: Z-Piece (Top Layer)
Indices: [15, 16, 17, 14]
```
Top layer view (Y=1):
  Z
  ↑
-1| X - -
 0| X X -
 1| - X -
  +------→ X
   -1 0 1
```

### Shape 5: 3D Corner
Indices: [13, 14, 16, 22]
```
3D corner from center:
Center (13) + Front (14) + Top (16) + Right (22)
```

## Gradient Colors (27 shades)
From #0c211a (darkest green) → #f8eee4 (cream)
