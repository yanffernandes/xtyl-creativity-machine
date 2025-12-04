"""
Email Service - Brevo (SendinBlue) Integration
Handles all email sending functionality
"""

import os
from typing import List, Optional
import requests
from datetime import datetime

BREVO_API_KEY = os.getenv("BREVO_API_KEY")
BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@xtyl.com")
FROM_NAME = os.getenv("FROM_NAME", "XTYL Creativity Machine")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    to_name: Optional[str] = None
) -> bool:
    """
    Send email using Brevo API

    Args:
        to_email: Recipient email address
        subject: Email subject
        html_content: HTML content of the email
        to_name: Recipient name (optional)

    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    if not BREVO_API_KEY:
        print("⚠️ BREVO_API_KEY not configured. Email not sent.")
        print(f"Would send to: {to_email}")
        print(f"Subject: {subject}")
        return False

    headers = {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json"
    }

    payload = {
        "sender": {
            "name": FROM_NAME,
            "email": FROM_EMAIL
        },
        "to": [
            {
                "email": to_email,
                "name": to_name or to_email.split("@")[0]
            }
        ],
        "subject": subject,
        "htmlContent": html_content
    }

    try:
        response = requests.post(BREVO_API_URL, json=payload, headers=headers)
        response.raise_for_status()
        print(f"✓ Email sent to {to_email}: {subject}")
        return True
    except requests.exceptions.RequestException as e:
        print(f"✗ Failed to send email to {to_email}: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Response: {e.response.text}")
        return False


def send_password_reset_email(email: str, reset_token: str, user_name: Optional[str] = None) -> bool:
    """
    Send password reset email

    Args:
        email: User's email address
        reset_token: Password reset token
        user_name: User's name (optional)

    Returns:
        bool: True if email was sent successfully
    """
    reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recuperação de Senha - XTYL</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Recuperação de Senha</h1>
        </div>

        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">
                Olá{f" {user_name}" if user_name else ""},
            </p>

            <p style="font-size: 16px; margin-bottom: 20px;">
                Você solicitou a recuperação de senha para sua conta no <strong>XTYL Creativity Machine</strong>.
            </p>

            <p style="font-size: 16px; margin-bottom: 30px;">
                Clique no botão abaixo para criar uma nova senha:
            </p>

            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_link}"
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                          color: white;
                          padding: 15px 40px;
                          text-decoration: none;
                          border-radius: 5px;
                          font-weight: bold;
                          display: inline-block;
                          font-size: 16px;">
                    Redefinir Senha
                </a>
            </div>

            <p style="font-size: 14px; color: #666; margin-top: 30px;">
                Ou copie e cole este link no seu navegador:
            </p>
            <p style="font-size: 12px; color: #667eea; word-break: break-all; background: white; padding: 10px; border-radius: 5px;">
                {reset_link}
            </p>

            <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                ⏰ Este link expira em <strong>1 hora</strong>.<br>
                ⚠️ Se você não solicitou esta recuperação, ignore este email.
            </p>
        </div>

        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>© {datetime.now().year} XTYL Creativity Machine. Todos os direitos reservados.</p>
        </div>
    </body>
    </html>
    """

    return send_email(
        to_email=email,
        subject="🔐 Recuperação de Senha - XTYL",
        html_content=html_content,
        to_name=user_name
    )


def send_workspace_invite_email(email: str, workspace_name: str, invited_by: str, invite_token: str, temp_password: str = None) -> bool:
    """
    Send workspace invitation email to non-registered users

    Args:
        email: Recipient's email address
        workspace_name: Name of the workspace
        invited_by: Name of the person who invited
        invite_token: Invitation token for signup
        temp_password: Temporary password for the new account

    Returns:
        bool: True if email was sent successfully
    """
    signup_link = f"{FRONTEND_URL}/signup?invite={invite_token}&email={email}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Convite para XTYL</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #5B8DEF 0%, #4A7AD9 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">✉️ Você foi convidado!</h1>
        </div>

        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">
                Olá,
            </p>

            <p style="font-size: 16px; margin-bottom: 20px;">
                <strong>{invited_by}</strong> convidou você para participar do workspace <strong>"{workspace_name}"</strong> no <strong>XTYL Creativity Machine</strong>.
            </p>

            <p style="font-size: 16px; margin-bottom: 30px;">
                O XTYL é uma plataforma completa para criação e gerenciamento de conteúdo criativo com inteligência artificial.
            </p>

            <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #5B8DEF;">✨ O que você pode fazer:</h3>
                <ul style="padding-left: 20px;">
                    <li style="margin-bottom: 10px;">📝 Criar e gerenciar documentos com IA</li>
                    <li style="margin-bottom: 10px;">🎨 Gerar imagens com modelos avançados</li>
                    <li style="margin-bottom: 10px;">💬 Chat inteligente com contexto</li>
                    <li style="margin-bottom: 10px;">📊 Organizar projetos em pastas</li>
                    <li style="margin-bottom: 10px;">🖼️ Biblioteca de assets visuais</li>
                </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="{signup_link}"
                   style="background: #5B8DEF;
                          color: #ffffff;
                          padding: 15px 40px;
                          text-decoration: none;
                          border-radius: 8px;
                          font-weight: bold;
                          display: inline-block;
                          font-size: 16px;
                          box-shadow: 0 4px 6px rgba(91, 141, 239, 0.3);">
                    Aceitar Convite e Criar Conta
                </a>
            </div>

            <p style="font-size: 14px; color: #666; margin-top: 30px;">
                Ou copie e cole este link no seu navegador:
            </p>
            <p style="font-size: 12px; color: #5B8DEF; word-break: break-all; background: white; padding: 10px; border-radius: 5px;">
                {signup_link}
            </p>

            {f'''
            <div style="background: white; padding: 20px; border-radius: 5px; margin: 30px 0; border-left: 4px solid #5B8DEF;">
                <h3 style="margin-top: 0; color: #5B8DEF;">🔑 Suas credenciais temporárias:</h3>
                <p style="margin: 10px 0;"><strong>Email:</strong> {email}</p>
                <p style="margin: 10px 0;"><strong>Senha temporária:</strong> <code style="background: #f0f0f0; padding: 4px 8px; border-radius: 4px; font-family: monospace;">{temp_password}</code></p>
                <p style="font-size: 12px; color: #666; margin-top: 15px;">
                    💡 Recomendamos alterar sua senha após o primeiro login.
                </p>
            </div>
            ''' if temp_password else ''}

            <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                ⏰ Este convite expira em <strong>7 dias</strong>.<br>
                ⚠️ Se você não esperava este convite, pode ignorar este email com segurança.
            </p>
        </div>

        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>© {datetime.now().year} XTYL Creativity Machine. Todos os direitos reservados.</p>
        </div>
    </body>
    </html>
    """

    return send_email(
        to_email=email,
        subject=f"✉️ {invited_by} convidou você para o workspace '{workspace_name}' - XTYL",
        html_content=html_content
    )


def send_welcome_email(email: str, workspace_name: str, invited_by: str, user_name: Optional[str] = None) -> bool:
    """
    Send welcome email when user is added to a workspace

    Args:
        email: User's email address
        workspace_name: Name of the workspace
        invited_by: Name of the person who invited
        user_name: User's name (optional)

    Returns:
        bool: True if email was sent successfully
    """
    login_link = f"{FRONTEND_URL}/login"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bem-vindo ao XTYL</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Bem-vindo ao XTYL!</h1>
        </div>

        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">
                Olá{f" {user_name}" if user_name else ""},
            </p>

            <p style="font-size: 16px; margin-bottom: 20px;">
                Você foi adicionado ao workspace <strong>"{workspace_name}"</strong> por <strong>{invited_by}</strong>.
            </p>

            <p style="font-size: 16px; margin-bottom: 30px;">
                O <strong>XTYL Creativity Machine</strong> é sua plataforma completa para criação e gerenciamento de conteúdo criativo com inteligência artificial.
            </p>

            <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #667eea;">✨ O que você pode fazer:</h3>
                <ul style="padding-left: 20px;">
                    <li style="margin-bottom: 10px;">📝 Criar e gerenciar documentos com IA</li>
                    <li style="margin-bottom: 10px;">🎨 Gerar imagens com modelos avançados</li>
                    <li style="margin-bottom: 10px;">💬 Chat inteligente com contexto</li>
                    <li style="margin-bottom: 10px;">📊 Organizar projetos em pastas</li>
                    <li style="margin-bottom: 10px;">🖼️ Biblioteca de assets visuais</li>
                </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="{login_link}"
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                          color: white;
                          padding: 15px 40px;
                          text-decoration: none;
                          border-radius: 5px;
                          font-weight: bold;
                          display: inline-block;
                          font-size: 16px;">
                    Acessar Plataforma
                </a>
            </div>

            <p style="font-size: 14px; color: #666; margin-top: 30px;">
                <strong>Suas credenciais:</strong><br>
                Email: {email}<br>
                Senha: (use a senha que você cadastrou ou solicite recuperação se necessário)
            </p>

            <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                💡 <strong>Dica:</strong> Explore os templates disponíveis para começar rapidamente!
            </p>
        </div>

        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>© {datetime.now().year} XTYL Creativity Machine. Todos os direitos reservados.</p>
            <p>Se você recebeu este email por engano, por favor ignore.</p>
        </div>
    </body>
    </html>
    """

    return send_email(
        to_email=email,
        subject=f"🎉 Você foi adicionado ao workspace '{workspace_name}' - XTYL",
        html_content=html_content,
        to_name=user_name
    )
