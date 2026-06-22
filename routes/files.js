const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const supabase = require('../supabase');
const archiver = require('archiver');
const qrStore = require('../qrStore');
const { requireAuth, requireRoles } = require('../middleware/auth');
const router = express.Router();

// Configuração do multer usando memory storage para Vercel serverless
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/avi', 'video/mov', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido'), false);
    }
  }
});

// Middleware de tratamento de erro do multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    console.error('Erro do Multer:', error);
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Arquivo muito grande. Máximo 50MB.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Número de arquivos excedido.' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Campo de arquivo inesperado.' });
    }
    return res.status(400).json({ error: 'Erro no upload: ' + error.message });
  } else if (error) {
    console.error('Erro no upload:', error);
    return res.status(500).json({ error: 'Erro interno no upload.' });
  }
  next();
});

// Upload de múltiplos arquivos
router.post('/upload', upload.array('arquivos'), async (req, res) => {
  console.error('=== UPLOAD REQUEST ===');
  console.error('Body:', req.body);
  console.error('Files:', req.files);
  
  const qrToken = req.body?.token;
  console.error('QR Token:', qrToken);
  
  const lockResult = qrToken ? qrStore.lock(qrToken) : { valid: false };
  console.error('Lock result:', lockResult);

  try {
    console.error('VERIFICANDO ARQUIVOS...');
    if (!req.files || req.files.length === 0) {
      console.error('❌ Nenhum arquivo enviado');
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    console.error('✅ Arquivos recebidos:', req.files.length);

    console.error('VERIFICANDO TOKEN QR...');
    if (!qrToken) {
      console.error('❌ Token do QR Code não fornecido');
      return res.status(400).json({ error: 'Token do QR Code é obrigatório' });
    }
    console.error('✅ Token QR recebido');

    console.error('VERIFICANDO LOCK RESULT...');
    console.error('Lock result valid:', lockResult.valid);
    console.error('Lock result reason:', lockResult.reason);
    console.error('Lock result data:', lockResult.data);
    
    if (!lockResult.valid) {
      console.error('❌ QR Code inválido ou expirado:', lockResult.reason);
      console.error('❌ Detalhes do lock result:', JSON.stringify(lockResult, null, 2));
      return res.status(400).json({ error: lockResult.reason || 'QR Code inválido ou expirado' });
    }
    console.error('✅ Lock result válido');

    const { nome, descricao } = req.body;
    console.error('Nome:', nome);
    console.error('Descrição:', descricao);

    console.error('VERIFICANDO NOME...');
    if (!nome) {
      console.error('❌ Nome não fornecido');
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }
    console.error('✅ Nome recebido');

    // Salvar múltiplos arquivos no Supabase Storage e banco de dados
    const savedFiles = [];
    let hasError = false;

    console.error('=== INICIANDO UPLOAD DIRETO PARA SUPABASE STORAGE ===');
    console.error('Pulando verificação de bucket (anon key não tem permissões)');

    // Processar cada arquivo
    for (const file of req.files) {
      const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
      const filePath = `uploads/${fileName}`;
      
      try {
        console.error('=== PROCESSANDO ARQUIVO ===');
        console.error('Nome original:', file.originalname);
        console.error('Nome gerado:', fileName);
        console.error('Caminho:', filePath);
        console.error('Tipo:', file.mimetype);
        console.error('Tamanho:', file.size);
        console.error('Buffer length:', file.buffer.length);
        
        // Upload para Supabase Storage
        console.error('Iniciando upload para Supabase Storage...');
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('files')
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: false
          });

        if (uploadError) {
          console.error('❌ Erro no upload para Supabase Storage:', uploadError);
          console.error('Erro details:', JSON.stringify(uploadError, null, 2));
          throw new Error(`Erro no upload para Supabase Storage: ${uploadError.message}`);
        }

        console.error('✅ Upload para Supabase Storage bem-sucedido:', uploadData);

        // Salvar metadados no banco de dados
        console.error('Salvando metadados no banco de dados...');
        const { data: inserted, error } = await supabase
          .from('files')
          .insert({
            nome: file.originalname,
            caminho: filePath,
            tipo: file.mimetype,
            tamanho: file.size,
            usuario_nome: nome,
            descricao: descricao || '',
            status: 'PENDING',
            data_upload: new Date().toISOString()
          })
          .select('id, nome, status')
          .single();

        if (error) {
          console.error('❌ Erro ao salvar no banco de dados:', error);
          console.error('Erro details:', JSON.stringify(error, null, 2));
          // Remover arquivo do Supabase Storage em caso de erro
          await supabase.storage.from('files').remove([filePath]);
          throw new Error(`Erro ao salvar no banco de dados: ${error.message}`);
        }

        console.error('✅ Metadados salvos com sucesso:', inserted);

        savedFiles.push({
          id: inserted.id,
          nome: inserted.nome,
          status: inserted.status
        });
      } catch (error) {
        console.error('❌ Erro ao processar arquivo:', error);
        console.error('Stack trace:', error.stack);
        hasError = true;
        break;
      }
    }

    if (hasError) {
      return res.status(500).json({ error: 'Erro ao salvar um ou mais arquivos' });
    }

    qrStore.markUsed(qrToken);

    res.json({
      message: `${savedFiles.length} arquivo(s) enviado(s) com sucesso! Aguarde aprovação.`,
      files: savedFiles
    });

  } catch (error) {
    console.error('❌ Erro no upload:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Erro ao fazer upload dos arquivos: ' + error.message });
  } finally {
    if (qrToken) {
      qrStore.unlock(qrToken);
    }
  }
});

// Listar arquivos
router.get('/', async (req, res) => {
  try {
    const { data: files, error } = await supabase
      .from('files')
      .select('*')
      .eq('status', 'APPROVED')
      .order('data_upload', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Erro ao listar arquivos' });
    }

    const filesWithUrls = (files || []).map(file => {
      // Gerar URL assinada do Supabase Storage (válida por 1 hora)
      const { data: signedUrlData, error: signedUrlError } = supabase.storage
        .from('files')
        .createSignedUrl(file.caminho, 3600); // 3600 segundos = 1 hora
      
      if (signedUrlError) {
        console.error('Erro ao criar signed URL:', signedUrlError);
        return {
          ...file,
          caminho: file.caminho // Fallback para o caminho original
        };
      }
      
      return {
        ...file,
        caminho: signedUrlData.signedUrl
      };
    });

    res.json(filesWithUrls);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar arquivos' });
  }
});

// Listar arquivos pendentes
router.get(
  '/pending',
  requireAuth,
  requireRoles(['SONOPLASTA', 'DIRETOR', 'ADMIN']),
  async (req, res) => {
  try {
    const { data: files, error } = await supabase
      .from('files')
      .select('*')
      .eq('status', 'PENDING')
      .order('data_upload', { ascending: false });
    
    if (error) {
      console.error('Erro ao listar arquivos pendentes:', error);
      return res.status(500).json({ error: 'Erro ao listar arquivos' });
    }
    
    res.json(files || []);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar arquivos' });
  }
});

// Listar arquivos aprovados
router.get('/approved', async (req, res) => {
  try {
    const { data: files, error } = await supabase
      .from('files')
      .select('*')
      .eq('status', 'APPROVED')
      .order('data_upload', { ascending: false });
    
    if (error) {
      console.error('Erro ao listar arquivos aprovados:', error);
      return res.status(500).json({ error: 'Erro ao listar arquivos' });
    }
    
    const filesWithUrls = (files || []).map(file => {
      // Gerar URL assinada do Supabase Storage (válida por 1 hora)
      const { data: signedUrlData, error: signedUrlError } = supabase.storage
        .from('files')
        .createSignedUrl(file.caminho, 3600); // 3600 segundos = 1 hora
      
      if (signedUrlError) {
        console.error('Erro ao criar signed URL:', signedUrlError);
        return {
          ...file,
          caminho: file.caminho // Fallback para o caminho original
        };
      }
      
      return {
        ...file,
        caminho: signedUrlData.signedUrl
      };
    });
    
    res.json(filesWithUrls);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar arquivos' });
  }
});

// Aprovar arquivo
router.patch('/:id/approve', requireAuth, requireRoles(['DIRETOR', 'ADMIN']), async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);

    const { data, error } = await supabase
      .from('files')
      .update({ status: 'APPROVED', aprovado_em: new Date().toISOString() })
      .eq('id', fileId)
      .select('id, status')
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    res.json({
      message: 'Arquivo aprovado com sucesso',
      file: {
        id: data.id,
        status: data.status
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao aprovar arquivo' });
  }
});

// Rejeitar arquivo
router.patch('/:id/reject', requireAuth, requireRoles(['DIRETOR', 'ADMIN']), async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);

    const { data, error } = await supabase
      .from('files')
      .update({ status: 'REJECTED', rejeitado_em: new Date().toISOString() })
      .eq('id', fileId)
      .select('id, status')
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    res.json({
      message: 'Arquivo rejeitado com sucesso',
      file: {
        id: data.id,
        status: data.status
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao rejeitar arquivo' });
  }
});

// Download de arquivo
router.get('/download/:id', async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);

    const { data: file, error } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (error || !file) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    // Download do Supabase Storage
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('files')
      .createSignedUrl(file.caminho, 60); // URL válida por 60 segundos

    if (downloadError) {
      console.error('Erro ao criar signed URL:', downloadError);
      return res.status(500).json({ error: 'Erro ao fazer download do arquivo' });
    }

    // Redirecionar para a URL assinada
    res.redirect(downloadData.signedUrl);
    
  } catch (error) {
    console.error('Erro no download:', error);
    res.status(500).json({ error: 'Erro ao fazer download do arquivo' });
  }
});

// Download de múltiplos arquivos como ZIP
router.post('/download-zip', async (req, res) => {
  try {
    const { fileIds, groupName } = req.body;
    
    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ error: 'IDs de arquivos inválidos' });
    }

    const { data: files, error } = await supabase
      .from('files')
      .select('*')
      .in('id', fileIds)
      .eq('status', 'APPROVED');

    if (error) {
      return res.status(500).json({ error: 'Erro ao buscar arquivos' });
    }

    if (!files || files.length === 0) {
      return res.status(404).json({ error: 'Nenhum arquivo encontrado' });
    }

    const safeGroupName = String(groupName || 'arquivos').replace(/[^a-zA-Z0-9]/g, '_');
    const zipName = `${safeGroupName}_${Date.now()}.zip`;
    res.attachment(zipName);

    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', () => {
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erro ao criar arquivo ZIP' });
      }
    });

    archive.pipe(res);

    // Baixar cada arquivo do Supabase Storage e adicionar ao ZIP
    for (const file of files) {
      try {
        const { data: downloadData, error: downloadError } = await supabase.storage
          .from('files')
          .createSignedUrl(file.caminho, 60);

        if (downloadError) {
          console.error('Erro ao criar signed URL para arquivo:', file.nome, downloadError);
          continue;
        }

        // Baixar o arquivo usando a signed URL
        const response = await fetch(downloadData.signedUrl);
        const buffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);

        archive.append(uint8Array, { name: file.nome });
      } catch (fileError) {
        console.error('Erro ao baixar arquivo:', file.nome, fileError);
      }
    }

    archive.finalize();
    
  } catch (error) {
    console.error('Erro no download ZIP:', error);
    res.status(500).json({ error: 'Erro ao fazer download dos arquivos' });
  }
});

module.exports = router;
