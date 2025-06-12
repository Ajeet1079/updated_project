import FreeCAD
import Part
import MeshPart
import os
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import threading

class CADConverterGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("CAD to STL Converter")
        self.root.geometry("600x400")
        self.root.resizable(True, True)
        
        # Variables
        self.input_file = tk.StringVar()
        self.output_file = tk.StringVar()
        
        self.setup_ui()
        
    def setup_ui(self):
        # Main frame
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Configure grid weights
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)
        
        # Title
        title_label = ttk.Label(main_frame, text="CAD to STL Converter", 
                               font=("Arial", 16, "bold"))
        title_label.grid(row=0, column=0, columnspan=3, pady=(0, 20))
        
        # Input file section
        ttk.Label(main_frame, text="Input File:").grid(row=1, column=0, sticky=tk.W, pady=5)
        
        input_entry = ttk.Entry(main_frame, textvariable=self.input_file, width=50)
        input_entry.grid(row=1, column=1, sticky=(tk.W, tk.E), padx=(10, 5), pady=5)
        
        input_browse_btn = ttk.Button(main_frame, text="Browse", command=self.browse_input_file)
        input_browse_btn.grid(row=1, column=2, pady=5)
        
        # Output file section
        ttk.Label(main_frame, text="Output File:").grid(row=2, column=0, sticky=tk.W, pady=5)
        
        output_entry = ttk.Entry(main_frame, textvariable=self.output_file, width=50)
        output_entry.grid(row=2, column=1, sticky=(tk.W, tk.E), padx=(10, 5), pady=5)
        
        output_browse_btn = ttk.Button(main_frame, text="Browse", command=self.browse_output_file)
        output_browse_btn.grid(row=2, column=2, pady=5)
        
        # Conversion parameters frame
        params_frame = ttk.LabelFrame(main_frame, text="Conversion Parameters", padding="10")
        params_frame.grid(row=3, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(20, 10))
        params_frame.columnconfigure(1, weight=1)
        
        # Linear deflection
        ttk.Label(params_frame, text="Linear Deflection:").grid(row=0, column=0, sticky=tk.W, pady=2)
        self.linear_deflection = tk.StringVar(value="0.1")
        linear_entry = ttk.Entry(params_frame, textvariable=self.linear_deflection, width=10)
        linear_entry.grid(row=0, column=1, sticky=tk.W, padx=(10, 0), pady=2)
        
        # Angular deflection
        ttk.Label(params_frame, text="Angular Deflection:").grid(row=1, column=0, sticky=tk.W, pady=2)
        self.angular_deflection = tk.StringVar(value="0.523599")
        angular_entry = ttk.Entry(params_frame, textvariable=self.angular_deflection, width=10)
        angular_entry.grid(row=1, column=1, sticky=tk.W, padx=(10, 0), pady=2)
        
        # Convert button
        self.convert_btn = ttk.Button(main_frame, text="Convert to STL", 
                                     command=self.start_conversion, style="Accent.TButton")
        self.convert_btn.grid(row=4, column=0, columnspan=3, pady=20)
        
        # Progress bar
        self.progress = ttk.Progressbar(main_frame, mode='indeterminate')
        self.progress.grid(row=5, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=(0, 10))
        
        # Status text area
        self.status_text = tk.Text(main_frame, height=8, width=70)
        self.status_text.grid(row=6, column=0, columnspan=3, sticky=(tk.W, tk.E, tk.N, tk.S), pady=(0, 10))
        
        # Scrollbar for status text
        scrollbar = ttk.Scrollbar(main_frame, orient="vertical", command=self.status_text.yview)
        scrollbar.grid(row=6, column=3, sticky=(tk.N, tk.S), pady=(0, 10))
        self.status_text.configure(yscrollcommand=scrollbar.set)
        
        # Configure grid weights for resizing
        main_frame.rowconfigure(6, weight=1)
        
        # Initial status
        self.log_message("Ready to convert CAD files to STL format.")
        self.log_message("Supported input formats: STEP (.step, .stp), IGES (.igs, .iges), OBJ (.obj)")
        
    def browse_input_file(self):
        file_path = filedialog.askopenfilename(
            title="Select CAD File",
            filetypes=[
                ("All Supported", "*.step;*.stp;*.igs;*.iges;*.obj"),
                ("STEP Files", "*.step;*.stp"),
                ("IGES Files", "*.igs;*.iges"),
                ("OBJ Files", "*.obj"),
                ("All Files", "*.*")
            ]
        )
        if file_path:
            self.input_file.set(file_path)
            # Auto-generate output filename
            input_dir = os.path.dirname(file_path)
            input_name = os.path.splitext(os.path.basename(file_path))[0]
            output_path = os.path.join(input_dir, f"{input_name}.stl")
            self.output_file.set(output_path)
            self.log_message(f"Selected input file: {file_path}")
            
    def browse_output_file(self):
        file_path = filedialog.asksaveasfilename(
            title="Save STL File As",
            defaultextension=".stl",
            filetypes=[("STL Files", "*.stl"), ("All Files", "*.*")]
        )
        if file_path:
            self.output_file.set(file_path)
            self.log_message(f"Selected output file: {file_path}")
            
    def log_message(self, message):
        self.status_text.insert(tk.END, message + "\n")
        self.status_text.see(tk.END)
        self.root.update_idletasks()
        
    def start_conversion(self):
        if not self.input_file.get():
            messagebox.showerror("Error", "Please select an input file.")
            return
            
        if not self.output_file.get():
            messagebox.showerror("Error", "Please specify an output file.")
            return
            
        # Disable convert button and start progress
        self.convert_btn.config(state="disabled")
        self.progress.start()
        
        # Run conversion in separate thread to prevent GUI freezing
        thread = threading.Thread(target=self.convert_file)
        thread.daemon = True
        thread.start()
        
    def convert_file(self):
        try:
            input_path = self.input_file.get()
            output_path = self.output_file.get()
            
            self.log_message(f"Starting conversion...")
            self.log_message(f"Input: {input_path}")
            self.log_message(f"Output: {output_path}")
            
            # Ensure output directory exists
            output_dir = os.path.dirname(output_path)
            if not os.path.exists(output_dir):
                os.makedirs(output_dir)
                self.log_message(f"Created output directory: {output_dir}")
            
            # Get conversion parameters
            try:
                linear_def = float(self.linear_deflection.get())
                angular_def = float(self.angular_deflection.get())
            except ValueError:
                raise Exception("Invalid deflection values. Please enter numeric values.")
            
            self.log_message("Loading CAD file...")
            
            # Load the shape
            shape = Part.Shape()
            shape.read(input_path)
            
            self.log_message("Converting to mesh...")
            
            # Convert to mesh using MeshPart
            mesh = MeshPart.meshFromShape(
                Shape=shape, 
                LinearDeflection=linear_def, 
                AngularDeflection=angular_def
            )
            
            self.log_message("Writing STL file...")
            
            # Export to STL
            mesh.write(output_path)
            
            self.log_message(f"✓ Successfully converted {os.path.basename(input_path)} to {os.path.basename(output_path)}")
            self.log_message(f"Output file size: {os.path.getsize(output_path)} bytes")
            
            # Show success message
            self.root.after(0, lambda: messagebox.showinfo("Success", 
                f"File converted successfully!\nOutput: {output_path}"))
            
        except Exception as e:
            error_msg = f"Error during conversion: {str(e)}"
            self.log_message(f"✗ {error_msg}")
            self.root.after(0, lambda: messagebox.showerror("Conversion Error", error_msg))
            
        finally:
            # Re-enable convert button and stop progress
            self.root.after(0, self.conversion_finished)
            
    def conversion_finished(self):
        self.convert_btn.config(state="normal")
        self.progress.stop()

def main():
    root = tk.Tk()
    app = CADConverterGUI(root)
    root.mainloop()

if __name__ == "__main__":
    main()
