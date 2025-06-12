import sys
import os
from OCC.Core.STEPControl import STEPControl_Reader
from OCC.Core.IGESControl import IGESControl_Reader
from OCC.Core.StlAPI import StlAPI_Writer
from OCC.Core.BRepMesh import BRepMesh_IncrementalMesh
from OCC.Extend.DataExchange import read_step_file, read_iges_file
from OCC.Core.TopoDS import TopoDS_Shape
from OCC.Core.BRep import BRep_Builder
from OCC.Extend.DataExchange import read_stl_file, read_obj_file

def convert_to_stl(input_file, output_file, mesh_quality=0.1):
    extension = os.path.splitext(input_file)[1].lower()

    shape = None

    try:
        if extension == '.step' or extension == '.stp':
            print(f"Reading STEP file: {input_file}")
            shape = read_step_file(input_file)

        elif extension == '.iges' or extension == '.igs':
            print(f"Reading IGES file: {input_file}")
            shape = read_iges_file(input_file)

        elif extension == '.obj':
            print(f"Reading OBJ file: {input_file}")
            shape = read_obj_file(input_file)

        else:
            print(f"Unsupported file format: {extension}")
            return

        if shape is None:
            print("Failed to load shape from file.")
            return

        print("Meshing the shape...")
        mesh = BRepMesh_IncrementalMesh(shape, mesh_quality)
        mesh.Perform()

        print(f"Writing STL file: {output_file}")
        stl_writer = StlAPI_Writer()
        stl_writer.Write(shape, output_file)

        print("Conversion completed successfully.")

    except Exception as e:
        print(f"Error during conversion: {str(e)}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python convert_to_stl.py <input_file> <output_file>")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    convert_to_stl(input_file, output_file)

