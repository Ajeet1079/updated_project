#!/bin/bash

# Update system
sudo apt update

# Install curl
sudo apt install curl -y

# Install Brave browser
curl -fsS https://dl.brave.com/install.sh | sh

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v

# Install Git
sudo apt install git -y

# Install Python
sudo apt install software-properties-common -y
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt update
sudo apt install python3 -y
sudo apt install python3-pip -y

# Install build tools
sudo apt install build-essential cmake -y

# Install FreeCAD
sudo apt install freecad -y

# Install Python library
pip install trimesh --break-system-packages

# Install Visual Studio Code
sudo apt install wget gpg -y
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > packages.microsoft.gpg
sudo install -o root -g root -m 644 packages.microsoft.gpg /etc/apt/trusted.gpg.d/
sudo sh -c 'echo "deb [arch=amd64] https://packages.microsoft.com/repos/vscode stable main" > /etc/apt/sources.list.d/vscode.list'
sudo apt update
sudo apt install code -y

echo "Setup completed successfully!"

