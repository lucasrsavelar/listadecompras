# 🛒 Lista de Compras

Aplicação web para gerenciar suas listas de compras de mercado, com foco em uso pelo celular.

## O que faz?

O **Lista de Compras** permite criar, organizar e acompanhar suas listas de supermercado de forma simples e prática. Tudo é salvo na nuvem, então você pode acessar de qualquer dispositivo.

### ✨ Funcionalidades

- **Criar listas** com nome e data personalizáveis
- **Adicionar itens** pesquisando por nome ou navegando por categorias (Frutas, Laticínios, Limpeza, etc.)
- **Configurar cada item** com quantidade, unidade de medida e observações (Ex: *2 Kg de Banana (Madura)*)
- **Editar e remover** itens a qualquer momento antes de ir ao mercado
- **Marcar itens** conforme for colocando no carrinho — o item fica riscado para facilitar o acompanhamento
- **Encerrar a lista** quando terminar as compras, mantendo o histórico
- **Consultar listas anteriores** para referência

### 📱 Fluxo de uso

1. **Na tela inicial**, toque em **Nova Lista** para começar
2. **Adicione itens** buscando pelo nome ou selecionando por categoria
3. **Ajuste** a quantidade, medida e observação de cada item
4. **Salve** a lista quando estiver pronta
5. **No mercado**, abra a lista e vá marcando os itens conforme pega cada um
6. **Ao finalizar**, encerre a lista — ela vai para o histórico

### 🎨 Design

Interface escura moderna, pensada para uso confortável em ambientes com pouca luz (como corredores de supermercado). Layout otimizado para celular com botões grandes e fáceis de tocar.

## Tecnologias

| Componente | Tecnologia |
|---|---|
| Interface | React + TypeScript |
| Estilização | CSS puro (dark theme) |
| Banco de dados | Supabase (PostgreSQL) |
| Build | Vite |

## Como rodar

1. Clone o repositório
2. Instale as dependências: `npm install`
3. Crie um arquivo `.env` com as credenciais do Supabase:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

4. Crie o banco de dados e as tabelas no Supabase (utilize o arquivo DATABASE.md como referência)

5. Gere a APK para instalação no celular. Sugestão: usar o EAS Build

```bash
# 1. Instalar o EAS CLI
npm install -g eas-cli

# 2. Login na conta Expo (crie em expo.dev se não tiver)
eas login

# 3. Configurar o projeto (só na primeira vez)
eas build:configure

# 4. Gerar o APK
eas build --platform android --profile preview
```

6. Instale a APK gerada no celular para começar a usar o aplicativo.

7. Alternativamente, inicie o servidor de desenvolvimento no computador para testes locais:

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`.