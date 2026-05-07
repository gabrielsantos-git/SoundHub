// Script para testar autenticação manualmente
const { default: fetch } = require('node-fetch');

async function testAuth() {
    try {
        console.log('🔍 Testando autenticação manual...');
        
        // 1. Fazer login
        console.log('\n1. Fazendo login com admin@soundhub.com...');
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@soundhub.com',
                senha: 'admin123'
            })
        });
        
        const loginData = await loginResponse.json();
        console.log('Status do login:', loginResponse.status);
        console.log('Resposta do login:', loginData);
        
        if (loginResponse.ok && loginData.token) {
            console.log('\n✅ Login bem-sucedido! Token obtido.');
            
            // 2. Testar validação do token
            console.log('\n2. Testando validação do token...');
            const meResponse = await fetch('http://localhost:3000/api/auth/me', {
                headers: {
                    'Authorization': 'Bearer ' + loginData.token
                }
            });
            
            const meData = await meResponse.json();
            console.log('Status da validação:', meResponse.status);
            console.log('Resposta da validação:', meData);
            
            if (meResponse.ok) {
                console.log('\n✅ Token válido! Usuário autenticado.');
                console.log('Dados do usuário:', meData.user);
            } else {
                console.log('\n❌ Token inválido!');
            }
        } else {
            console.log('\n❌ Login falhou!');
        }
        
    } catch (error) {
        console.error('❌ Erro no teste:', error);
    }
}

testAuth();
