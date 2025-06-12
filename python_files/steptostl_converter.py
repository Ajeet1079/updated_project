import FreeCAD
import Part
import MeshPart
import os
import sys

# Check argument length based on freecadcmd behavior
if len(sys.argv) != 4:
    print(f"Arguments received: {sys.argv}")
    print("Usage: freecadcmd steptostl_converter.py <input_file_path> <output_file_path>")
    sys.exit(1)

input_file = sys.argv[2]
output_file = sys.argv[3]

print(f"Input file: {input_file}")
print(f"Output file: {output_file}")

# Ensure output directory exists
output_dir = os.path.dirname(output_file)
if not os.path.exists(output_dir):
    os.makedirs(output_dir)

try:
    # Load the shape
    shape = Part.Shape()
    shape.read(input_file)

    # Convert to mesh using MeshPart
    mesh = MeshPart.meshFromShape(Shape=shape, LinearDeflection=0.1, AngularDeflection=0.523599)

    # Export to STL
    mesh.write(output_file)

    print(f"Successfully converted {input_file} to {output_file}")

except Exception as e:
    print(f"Exception while processing file: {input_file}")
    print(str(e))

