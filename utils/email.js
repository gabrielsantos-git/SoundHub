const nodemailer = require('nodemailer');

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

const from = () => `"SoundHub" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`;

function tpl(code, title, desc) {
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;background:#f1f5f9;margin:0;padding:24px">
<div style="max-width:440px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 2px 16px rgba(0,0,0,.08)">
  <div style="text-align:center;margin-bottom:20px;font-size:1.25rem;font-weight:800;color:#1d4ed8">SoundHub</div>
  <h2 style="color:#111827;font-size:1.1rem;margin:0 0 8px">${title}</h2>
  <p style="color:#6b7280;margin:0 0 20px;font-size:.9375rem">${desc}</p>
  <div style="background:#eff6ff;border-radius:12px;padding:18px;text-align:center;margin-bottom:20px">
    <span style="font-size:2.25rem;font-weight:800;letter-spacing:.3rem;color:#1d4ed8">${code}</span>
  </div>
  <p style="color:#9ca3af;font-size:.8125rem;margin:0;text-align:center">
    Este código expira em <strong>10 minutos</strong>.<br>Se não foi você, ignore este email.
  </p>
</div></body></html>`;
}

async function sendPasswordCode(to, code) {
  await createTransporter().sendMail({
    from: from(), to,
    subject: 'SoundHub — Código para alteração de senha',
    html: tpl(code, 'Alteração de Senha', 'Use o código abaixo para confirmar a alteração da sua senha:')
  });
}

async function sendEmailOldCode(to, code) {
  await createTransporter().sendMail({
    from: from(), to,
    subject: 'SoundHub — Confirme sua identidade',
    html: tpl(code, 'Verificação de Identidade', 'Para alterar seu email, confirme sua identidade com o código abaixo:')
  });
}

async function sendEmailNewCode(to, code) {
  await createTransporter().sendMail({
    from: from(), to,
    subject: 'SoundHub — Confirme seu novo email',
    html: tpl(code, 'Confirmar Novo Email', 'Use o código abaixo para confirmar seu novo endereço de email:')
  });
}

async function sendRegisterCode(to, code) {
  await createTransporter().sendMail({
    from: from(), to,
    subject: 'SoundHub — Confirme seu email para cadastro',
    html: tpl(code, 'Confirmar Email', 'Use o código abaixo para confirmar seu endereço de email e concluir o cadastro:')
  });
}

async function sendScheduleEmail(to, nome, dias) {
  const diasHtml = dias.map(d => {
    const data = new Date(d.data_especifica + 'T12:00:00').toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    return `<li style="padding:5px 0;color:#374151;font-size:.9375rem;text-transform:capitalize">${data}</li>`;
  }).join('');

  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;background:#f1f5f9;margin:0;padding:24px">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 2px 16px rgba(0,0,0,.08)">
  <div style="text-align:center;margin-bottom:20px;font-size:1.25rem;font-weight:800;color:#1d4ed8">SoundHub</div>
  <h2 style="color:#111827;font-size:1.1rem;margin:0 0 8px">Seus dias de escala</h2>
  <p style="color:#6b7280;margin:0 0 20px;font-size:.9375rem">Olá, <strong>${nome}</strong>! Confira abaixo os seus próximos dias na escala de sonoplastia:</p>
  <div style="background:#eff6ff;border-radius:12px;padding:18px 24px;margin-bottom:20px">
    <ul style="margin:0;padding-left:20px">${diasHtml}</ul>
  </div>
  <p style="color:#9ca3af;font-size:.8125rem;margin:0;text-align:center">Acesse o SoundHub para ver a escala completa.</p>
</div></body></html>`;

  await createTransporter().sendMail({
    from: from(), to,
    subject: 'SoundHub — Seus dias na escala',
    html
  });
}

function tplSimples(titulo, corpo, corDestaque = '#1d4ed8', bgDestaque = '#eff6ff') {
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;background:#f1f5f9;margin:0;padding:24px">
<div style="max-width:440px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 2px 16px rgba(0,0,0,.08)">
  <div style="text-align:center;margin-bottom:20px;font-size:1.25rem;font-weight:800;color:#1d4ed8">SoundHub</div>
  <h2 style="color:#111827;font-size:1.1rem;margin:0 0 12px">${titulo}</h2>
  <div style="background:${bgDestaque};border-radius:12px;padding:16px 20px;margin-bottom:20px;color:#374151;font-size:.9375rem;line-height:1.6">${corpo}</div>
  <p style="color:#9ca3af;font-size:.8125rem;margin:0;text-align:center">SoundHub — Sistema de Mídia</p>
</div></body></html>`;
}

async function sendAccountPending(to, nome) {
  await createTransporter().sendMail({
    from: from(), to,
    subject: 'SoundHub — Cadastro recebido, aguardando aprovação',
    html: tplSimples(
      'Cadastro recebido!',
      `Olá, <strong>${nome}</strong>!<br><br>Seu cadastro no SoundHub foi concluído com sucesso. Sua conta está <strong>aguardando aprovação</strong> de um Diretor ou Administrador.<br><br>Você receberá um novo email assim que sua conta for aprovada.`
    )
  });
}

async function sendAccountApproved(to, nome) {
  await createTransporter().sendMail({
    from: from(), to,
    subject: 'SoundHub — Sua conta foi aprovada!',
    html: tplSimples(
      'Conta aprovada!',
      `Olá, <strong>${nome}</strong>!<br><br>Boa notícia! Sua conta no SoundHub foi <strong>aprovada</strong>. Você já pode acessar o sistema normalmente.`,
      '#16a34a',
      '#dcfce7'
    )
  });
}

async function sendAccountDeleted(to, nome) {
  await createTransporter().sendMail({
    from: from(), to,
    subject: 'SoundHub — Sua conta foi removida',
    html: tplSimples(
      'Conta removida',
      `Olá, <strong>${nome}</strong>.<br><br>Sua conta no SoundHub foi <strong>removida</strong> por um administrador. Caso acredite que isso foi um engano, entre em contato com o responsável pelo sistema.`,
      '#dc2626',
      '#fee2e2'
    )
  });
}

module.exports = { sendPasswordCode, sendEmailOldCode, sendEmailNewCode, sendRegisterCode, sendScheduleEmail, sendAccountPending, sendAccountApproved, sendAccountDeleted };
