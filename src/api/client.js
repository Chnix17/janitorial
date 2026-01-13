import axios from 'axios';

// Configure axios to send cookies
axios.defaults.withCredentials = true;

async function readJson(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { success: false, message: 'Invalid server response.' };
  }
}

export async function apiLogin({ username, password }) {
  try {
    const response = await axios.post('http://localhost/janitorial/api/login.php', {
      operation: 'login',
      json: {
        username: username.trim(),
        password: password
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true
    });

    const data = response.data;
    
    if (!data.success) {
      return { success: false, message: data?.message || 'Login failed.' };
    }
    
    return data;
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, message: 'Network error. Please try again.' };
  }
}
