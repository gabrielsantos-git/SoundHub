const fs = require('fs');

// Ler o arquivo
let content = fs.readFileSync('receive.html', 'utf-8');

// Encontrar todas as ocorrências de "function checkAuth" (async ou não)
const pattern = /function checkAuth/g;
const matches = content.match(pattern);
console.log(`Ocorrências de 'function checkAuth' encontradas: ${matches ? matches.length : 0}`);

// Se houver mais de uma ocorrência, remover a segunda
if (matches && matches.length > 1) {
    // Encontrar a posição da segunda ocorrência
    const firstIndex = content.indexOf('function checkAuth');
    const secondIndex = content.indexOf('function checkAuth', firstIndex + 1);
    
    if (secondIndex !== -1) {
        // Encontrar o final da segunda função (próximo "function" que não seja parte da função atual)
        let nextFunctionIndex = content.indexOf('function', secondIndex + 1);
        
        // Pular a primeira ocorrência (que pode ser parte da função atual)
        if (nextFunctionIndex !== -1) {
            const nextNextFunctionIndex = content.indexOf('function', nextFunctionIndex + 1);
            
            if (nextNextFunctionIndex !== -1) {
                // Remover a segunda definição completa
                content = content.substring(0, secondIndex) + content.substring(nextNextFunctionIndex);
                console.log("Segunda ocorrência removida com sucesso!");
            } else {
                // Se não houver outra função após, remover até o final
                content = content.substring(0, secondIndex);
                console.log("Segunda ocorrência removida até o final!");
            }
        }
    }
}

// Escrever o arquivo corrigido
fs.writeFileSync('receive.html', content, 'utf-8');

console.log("Arquivo corrigido com sucesso!");
