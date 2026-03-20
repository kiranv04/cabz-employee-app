import api from './api';

export async function loginEmployee(mobile, password) {
  try {
    const response = await api.post('/api/mobile/employees/login', {
      mobile,
      password,
    });

    const { token, user, must_change_password } = response.data;

    if (!token) throw new Error('No token received');

    return {
      success: true,
      data: {
        token,
        user,
        mustChangePassword: must_change_password || false,
      },
    };
  } catch (error) {
    let message = 'Login failed. Please try again.';
    if (error.response) {
      message =
        error.response.data?.message ||
        `Server error (${error.response.status})`;
    } else if (error.request) {
      message = 'Network error. Check your connection.';
    }
    return { success: false, error: message };
  }
}

export async function logoutEmployee() {
  try {
    await api.post('/api/mobile/employees/logout');
  } catch (e) {
    // Fail silently — token already cleared locally
  }
}

export async function changePassword(currentPassword, newPassword) {
  try {
    await api.post('/api/mobile/employees/change-password', {
      current_password: currentPassword,
      password: newPassword,
      password_confirmation: newPassword,
    });
    return { success: true };
  } catch (error) {
    let message = 'Failed to change password.';
    if (error.response) {
      message = error.response.data?.message || message;
    }
    return { success: false, error: message };
  }
}