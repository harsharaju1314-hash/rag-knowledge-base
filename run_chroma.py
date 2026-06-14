import sys
import subprocess
import socket

def check_port_open(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(("127.0.0.1", port))
            return True
        except socket.error:
            return False

def install_chroma():
    try:
        import chromadb
        print("ChromaDB is already installed.")
    except ImportError:
        print("ChromaDB is not installed. Installing it via pip...")
        try:
            subprocess.run([sys.executable, "-m", "pip", "install", "chromadb"], check=True)
            print("Successfully installed ChromaDB.")
        except Exception as e:
            print(f"Failed to install ChromaDB: {e}")
            sys.exit(1)

def main():
    install_chroma()
    
    port = 8000
    if not check_port_open(port):
        print(f"Warning: Port {port} is already in use. Chroma server might already be running.")
        print("Please ensure ChromaDB server is running on port 8000.")
        return
        
    print(f"Starting ChromaDB server on port {port}...")
    try:
        # Run chroma server using python module runner programmatically
        subprocess.run([
            sys.executable, 
            "-c", 
            f"import chromadb.cli.cli; import sys; sys.argv=['chroma', 'run', '--path', './chroma_data', '--port', '{port}']; chromadb.cli.cli.app()"
        ])
    except KeyboardInterrupt:
        print("\nChromaDB server stopped.")
    except Exception as e:
        print(f"Error starting ChromaDB server: {e}")

if __name__ == "__main__":
    main()
