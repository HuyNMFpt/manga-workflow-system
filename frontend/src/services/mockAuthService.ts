// Mock Auth Service - For testing without backend
// File: src/services/mockAuthService.ts

export const MOCK_USERS = [
  {
    email: 'mangaka@demo.com',
    password: 'password123',
    token: 'mock-token-mangaka-12345',
    role: 'mangaka',
    user: {
      id: 1,
      name: 'Takehiko Inoue',
      email: 'mangaka@demo.com',
      avatar_url: null
    }
  },
  {
    email: 'assistant@demo.com',
    password: 'password123',
    token: 'mock-token-assistant-12345',
    role: 'assistant',
    user: {
      id: 2,
      name: 'Assistant Yamada',
      email: 'assistant@demo.com',
      avatar_url: null
    }
  },
  {
    email: 'editor@demo.com',
    password: 'password123',
    token: 'mock-token-editor-12345',
    role: 'tantou_editor',
    user: {
      id: 3,
      name: 'Editor Tanaka',
      email: 'editor@demo.com',
      avatar_url: null
    }
  },
  {
    email: 'board@demo.com',
    password: 'password123',
    token: 'mock-token-board-12345',
    role: 'editorial_board',
    user: {
      id: 4,
      name: 'Board Member Sato',
      email: 'board@demo.com',
      avatar_url: null
    }
  }
];

export const mockLogin = async (email: string, password: string) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Find user
  const user = MOCK_USERS.find(u => u.email === email && u.password === password);

  if (!user) {
    throw new Error('Email hoặc mật khẩu không đúng. Vui lòng thử lại.');
  }

  // Return success response
  return {
    success: true,
    token: user.token,
    role: user.role,
    user: user.user,
    message: 'Login successful'
  };
};

export const mockRegister = async (data: any) => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    success: true,
    message: 'Registration successful',
    user: {
      id: Date.now(),
      name: data.name,
      email: data.email
    }
  };
};

export const mockForgotPassword = async (email: string) => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    success: true,
    message: 'Password reset email sent'
  };
};

export const mockResetPassword = async (token: string, newPassword: string) => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    success: true,
    message: 'Password reset successful'
  };
};
