import { Controller, Post, Body, Get, Res, Query } from '@nestjs/common';
import { RecuperacionPasswordService } from './recuperacion-password.service';
import { RequestResetDto } from './dto/request-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

@ApiTags('Recuperación de Contraseña')
@Controller('auth/password')
export class RecuperacionPasswordController {
  constructor(
    private readonly recuperacionPasswordService: RecuperacionPasswordService,
  ) {}

  /**
   * Solicitar restablecimiento de contraseña
   * Envía un correo electrónico con un token único para restablecer la contraseña.
   */
  @Post('forgot')
  requestReset(@Body() requestResetDto: RequestResetDto) {
    return this.recuperacionPasswordService.requestReset(requestResetDto.email);
  }

  /**
   * Restablecer contraseña
   * Aplica la nueva contraseña usando el token de validación recibido por correo.
   */
  @Post('reset')
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.recuperacionPasswordService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.new_password,
    );
  }

  /**
   * Página para que el usuario ingrese nueva contraseña.
   * Devuelve un formulario sencillo que llama al endpoint POST /auth/password/reset
   */
  @Get('reset')
  getResetPage(@Res() res: Response, @Query('token') token?: string) {
    const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Restablecer contraseña</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }

      body {
        font-family: Arial, Helvetica, sans-serif;
        min-height: 100vh;
        background: linear-gradient(to bottom, #1a3a6b, #2563a8);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
      }

      .card {
        width: 100%;
        max-width: 400px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0;
      }

      .icon {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: rgba(255,255,255,0.12);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 24px;
      }

      .icon svg {
        width: 40px;
        height: 40px;
        stroke: white;
        fill: none;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      h2 {
        color: white;
        font-size: 22px;
        font-weight: bold;
        text-align: center;
        margin-bottom: 10px;
      }

      .subtitle {
        color: rgba(255,255,255,0.7);
        font-size: 14px;
        text-align: center;
        line-height: 1.5;
        margin-bottom: 32px;
      }

      .input-wrapper {
        position: relative;
        width: 100%;
        margin-bottom: 16px;
      }

      .input-wrapper svg {
        position: absolute;
        left: 14px;
        top: 50%;
        transform: translateY(-50%);
        width: 20px;
        height: 20px;
        stroke: #2563a8;
        fill: none;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
        pointer-events: none;
      }

      input[type="password"] {
        width: 100%;
        padding: 13px 14px 13px 44px;
        border: none;
        border-radius: 12px;
        background: white;
        font-size: 14px;
        color: #333;
        outline: none;
      }

      input[type="password"]::placeholder {
        color: #aaa;
      }

      button[type="submit"] {
        width: 100%;
        margin-top: 8px;
        padding: 14px;
        background: white;
        color: #1a3a6b;
        border: none;
        border-radius: 12px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        transition: opacity 0.2s;
      }

      button[type="submit"]:hover { opacity: 0.92; }
      button[type="submit"]:disabled { opacity: 0.6; cursor: not-allowed; }

      .msg {
        margin-top: 16px;
        font-size: 13px;
        text-align: center;
        width: 100%;
        min-height: 20px;
      }

      .error {
        color: #fca5a5;
      }

      .success {
        color: #86efac;
      }

      /* Vista de éxito */
      .success-view {
        display: none;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 16px;
      }

      .success-view.visible { display: flex; }

      .check-icon {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: rgba(255,255,255,0.12);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .check-icon svg {
        width: 44px;
        height: 44px;
        stroke: #4ade80;
        fill: none;
        stroke-width: 2.5;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
    </style>
  </head>
  <body>
    <div class="card">

      <!-- Vista formulario -->
      <div id="formView" style="width:100%;display:flex;flex-direction:column;align-items:center;">
        <div class="icon">
          <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <h2>Restablecer contraseña</h2>
        <p class="subtitle">Ingresa tu nueva contraseña para recuperar el acceso a tu cuenta</p>

        <form id="resetForm" style="width:100%">
          <input type="hidden" id="token" value="${token ? token : ''}" />

          <div class="input-wrapper">
            <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <input id="password" name="password" type="password" minlength="6" placeholder="Nueva contraseña" required />
          </div>

          <div class="input-wrapper">
            <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <input id="confirm" name="confirm" type="password" minlength="6" placeholder="Confirmar contraseña" required />
          </div>

          <button type="submit" id="submitBtn">Restablecer contraseña</button>
        </form>

        <div class="msg" id="message"></div>
      </div>

      <!-- Vista éxito -->
      <div class="success-view" id="successView">
        <div class="check-icon">
          <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2>¡Contraseña restablecida!</h2>
        <p class="subtitle">Tu contraseña fue actualizada correctamente. Serás redirigido al inicio en unos segundos.</p>
      </div>

    </div>

    <script>
      (function(){
        const form = document.getElementById('resetForm');
        const msg = document.getElementById('message');
        const tokenInput = document.getElementById('token');
        const submitBtn = document.getElementById('submitBtn');

        if(!tokenInput.value){
          const params = new URLSearchParams(window.location.search);
          const t = params.get('token');
          if(t) tokenInput.value = t;
        }

        form.addEventListener('submit', async function(e){
          e.preventDefault();
          msg.textContent = '';
          const password = document.getElementById('password').value;
          const confirm = document.getElementById('confirm').value;
          const token = tokenInput.value;

          if(password.length < 6){
            msg.innerHTML = '<span class="error">La contraseña debe tener al menos 6 caracteres.</span>';
            return;
          }
          if(password !== confirm){
            msg.innerHTML = '<span class="error">Las contraseñas no coinciden.</span>';
            return;
          }
          if(!token){
            msg.innerHTML = '<span class="error">Token de recuperación faltante.</span>';
            return;
          }

          submitBtn.disabled = true;
          submitBtn.textContent = 'Procesando...';

          try{
            const res = await fetch('/auth/password/reset', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token, new_password: password })
            });
            const data = await res.json();

            if(res.ok){
              document.getElementById('formView').style.display = 'none';
              document.getElementById('successView').classList.add('visible');
              setTimeout(() => { window.location.href = '/'; }, 2500);
            } else {
              msg.innerHTML = '<span class="error">' + (data.message || 'Error al restablecer la contraseña') + '</span>';
              submitBtn.disabled = false;
              submitBtn.textContent = 'Restablecer contraseña';
            }
          } catch(err){
            msg.innerHTML = '<span class="error">Error de red al intentar restablecer la contraseña.</span>';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Restablecer contraseña';
            console.error(err);
          }
        });
      })();
    </script>
  </body>
</html>`;

    res.type('html').send(html);
  }
}
