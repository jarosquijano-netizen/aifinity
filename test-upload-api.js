// Test the upload API directly
import axios from 'axios';

const API_URL = 'https://aifinity-production.up.railway.app/api';

// Your JWT token from the console
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwid…YwMn0.XFNH5Eb-BlD2_7AiihshfXddDW9B5DLBwKUsJzqjEwE';

async function testUpload() {
  try {
    console.log('\n🧪 Testing transaction upload API...\n');
    
    // Simple test transaction
    const testData = {
      transactions: [
        {
          bank: 'Test Bank',
          date: '2024-10-30',
          category: 'Food & Dining',
          description: 'Test Transaction',
          amount: 50.00,
          type: 'expense',
          computable: true
        }
      ],
      account_id: null,
      lastBalance: null
    };
    
    const response = await axios.post(`${API_URL}/transactions/upload`, testData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Success!', response.data);
    
  } catch (error) {
    console.error('\n❌ Error Response:\n');
    console.log('Status:', error.response?.status);
    console.log('Message:', error.response?.data?.message);
    console.log('Details:', error.response?.data?.details);
    console.log('\nFull error data:', JSON.stringify(error.response?.data, null, 2));
  }
}

testUpload();

