#!/bin/bash

echo "========================================"
echo "QA/UAT Sanity Check Test Runner"
echo "========================================"
echo ""

# Check if backend server is running
echo "Checking if backend server is running..."
if ! curl -s http://localhost:5000/health > /dev/null 2>&1; then
    echo ""
    echo "[WARNING] Backend server is not running!"
    echo ""
    echo "Please start the backend server first:"
    echo "  1. Open a new terminal"
    echo "  2. cd backend"
    echo "  3. npm run dev"
    echo ""
    read -p "Press Enter to continue anyway (tests will fail)..."
fi

echo ""
echo "Running QA/UAT Sanity Check Tests..."
echo ""

cd backend
npm run test:qa

echo ""
echo "========================================"
echo "Tests completed!"
echo "========================================"

