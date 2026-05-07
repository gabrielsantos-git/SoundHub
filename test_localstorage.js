// Script para testar localStorage e debug do problema
console.log('=== TESTE LOCALSTORAGE ===');

// Testar se localStorage está disponível
try {
    localStorage.setItem('test', 'test');
    const testValue = localStorage.getItem('test');
    console.log('✅ localStorage funcionando:', testValue);
    localStorage.removeItem('test');
} catch (error) {
    console.error('❌ localStorage não está funcionando:', error);
}

// Verificar token atual
const currentToken = localStorage.getItem('token');
console.log('Token atual:', currentToken ? 'EXISTS' : 'NULL');
console.log('Token length:', currentToken ? currentToken.length : 0);

// Verificar usuário atual
const currentUser = localStorage.getItem('user');
console.log('User atual:', currentUser ? 'EXISTS' : 'NULL');

if (currentUser) {
    try {
        const userObj = JSON.parse(currentUser);
        console.log('User object:', userObj);
        console.log('User cargo:', userObj.cargo);
    } catch (error) {
        console.error('❌ Erro ao parsear user:', error);
    }
}

// Testar API de autenticação
async function testAuthAPI() {
    if (!currentToken) {
        console.log('❌ Sem token para testar API');
        return;
    }
    
    try {
        console.log('🔍 Testando API /api/auth/me...');
        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': 'Bearer ' + currentToken
            }
        });
        
        console.log('Status API:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ API Response:', data);
        } else {
            console.log('❌ API falhou:', response.status);
            const errorData = await response.text();
            console.log('Error response:', errorData);
        }
    } catch (error) {
        console.error('❌ Erro na API:', error);
    }
}

// Executar teste
testAuthAPI();

console.log('=== FIM DO TESTE ===');
