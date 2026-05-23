import re

# Ler o arquivo
with open('receive.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Encontrar e remover a segunda definição de checkAuth
# A segunda definição começa após a função autoGenerateQR
pattern = r'        async function checkAuth\(\) \{[^}]+\n        \}\n\n        function showAuthRequired\(\)'
replacement = '        function showAuthRequired()'

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# Escrever o arquivo corrigido
with open('receive.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Arquivo corrigido com sucesso!")
