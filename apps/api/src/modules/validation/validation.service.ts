import { Injectable } from '@nestjs/common';

@Injectable()
export class ValidationService {
  validateProjectName(name: string) {
    const errors: string[] = [];

    if (!name || name.trim().length === 0) {
      errors.push('Project name cannot be empty');
    }

    if (name.length < 3) {
      errors.push('Project name must be at least 3 characters long');
    }

    if (name.length > 100) {
      errors.push('Project name must be 100 characters or less');
    }

    // Only allow letters, numbers, spaces, hyphens, and underscores
    const validPattern = /^[a-zA-Z0-9\s\-_]+$/;
    if (!validPattern.test(name)) {
      errors.push(
        'Project name can only contain letters, numbers, spaces, hyphens, and underscores',
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  validateEmail(email: string) {
    const errors: string[] = [];

    if (!email || email.trim().length === 0) {
      errors.push('Email cannot be empty');
    }

    // Basic email validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      errors.push('Invalid email format');
    }

    if (email.length > 255) {
      errors.push('Email must be 255 characters or less');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  validateWorkspaceName(name: string) {
    const errors: string[] = [];

    if (!name || name.trim().length === 0) {
      errors.push('Workspace name cannot be empty');
    }

    if (name.length < 3) {
      errors.push('Workspace name must be at least 3 characters long');
    }

    if (name.length > 100) {
      errors.push('Workspace name must be 100 characters or less');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  validateDocumentTitle(title: string) {
    const errors: string[] = [];

    if (!title || title.trim().length === 0) {
      errors.push('Document title cannot be empty');
    }

    if (title.length > 255) {
      errors.push('Document title must be 255 characters or less');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
