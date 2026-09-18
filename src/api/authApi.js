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

function extractErrorMessage(error, fallback) {
  if (error.response) {
    const data = error.response.data;
    if (data?.errors) {
      const firstField = Object.values(data.errors)[0];
      if (Array.isArray(firstField) && firstField[0]) return firstField[0];
    }
    return data?.message || fallback;
  }
  if (error.request) return 'Network error. Check your connection.';
  return fallback;
}

export async function sendSignupOtp({ name, email, mobile, password, branchCode }) {
  try {
    const response = await api.post('/api/mobile/employees/signup/send-otp', {
      name,
      email,
      mobile,
      password,
      password_confirmation: password,
      branch_code: branchCode,
    });

    return {
      success: true,
      data: {
        companyName: response.data.company_name,
        branchName: response.data.branch_name,
      },
    };
  } catch (error) {
    return { success: false, error: extractErrorMessage(error, 'Failed to send verification code.') };
  }
}

export async function resendSignupOtp(email) {
  try {
    await api.post('/api/mobile/employees/signup/resend-otp', { email });
    return { success: true };
  } catch (error) {
    return { success: false, error: extractErrorMessage(error, 'Failed to resend verification code.') };
  }
}

export async function verifySignupOtp(email, otp) {
  try {
    const response = await api.post('/api/mobile/employees/signup/verify-otp', { email, otp });
    const { token, user } = response.data;

    if (!token) throw new Error('No token received');

    return { success: true, data: { token, user } };
  } catch (error) {
    return { success: false, error: extractErrorMessage(error, 'Verification failed. Please try again.') };
  }
}