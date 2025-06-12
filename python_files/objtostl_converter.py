import tkinter as tk
from tkinter import filedialog, messagebox
import trimesh
import os

def select_obj_file():
    file_path = filedialog.askopenfilename(
        filetypes=[("OBJ Files", "*.obj")],
        title="Select OBJ File"
    )
    if file_path:
        obj_file_path.set(file_path)

def convert_to_stl():
    obj_path = obj_file_path.get()
    if not obj_path:
        messagebox.showerror("Error", "Please select an OBJ file first.")
        return

    try:
        # Load the OBJ file
        mesh = trimesh.load(obj_path)

        # If it's a Scene, combine all meshes
        if isinstance(mesh, trimesh.Scene):
            if not mesh.geometry:
                raise Exception("The OBJ file contains no geometry.")
            mesh = trimesh.util.concatenate(tuple(mesh.geometry.values()))

        # Create STL file path
        stl_path = os.path.splitext(obj_path)[0] + ".stl"
        
        # Export to STL
        mesh.export(stl_path)
        messagebox.showinfo("Success", f"Converted successfully to:\n{stl_path}")
    except Exception as e:
        messagebox.showerror("Conversion Failed", str(e))

# Setup GUI
root = tk.Tk()
root.title("OBJ to STL Converter")

obj_file_path = tk.StringVar()

frame = tk.Frame(root, padx=20, pady=20)
frame.pack()

tk.Label(frame, text="OBJ File:").grid(row=0, column=0, sticky="e")
tk.Entry(frame, textvariable=obj_file_path, width=50).grid(row=0, column=1, padx=5)
tk.Button(frame, text="Browse", command=select_obj_file).grid(row=0, column=2)

tk.Button(frame, text="Convert to STL", command=convert_to_stl, bg='green', fg='white').grid(row=1, column=1, pady=20)

root.mainloop()

