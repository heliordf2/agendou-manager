This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

Figma:
https://www.figma.com/design/sJtDO8WNiDcehboerUdlRq/FSW-Donald%E2%80%99s?node-id=440-199&p=f

Extensions:

- poimandres
- symbols
- Prettier - Code Formatter
- ESlint
- Prisma
- Post Css
- GitLens
- Simple React Snippets

---

Framework:

- Nextjs

  > npx create-next-app@15.1.6 .

- Prisma (ORM)

  > npm install prisma@6.2.1
  > npm install prisma/client@6.2.1
  > npx prisma init
  > npx prisma format
  > npx prisma migrate dev //add_initial_tables
  > npx prisma db seed //Popular base com dados do seed.ts
  > npm run seed
  > npx ts-node prisma/seed-user.ts //Criar usuário admin@agendou.com
  > npx prisma generate //Atualizar os tipos dos campos
  > npx prisma studio //Abrir SGBD

- NEON DB (Banco de dados)
  https://neon.com/

- Configuração de Email (Nodemailer)
  > npm install nodemailer
  > npm install -D @types/nodemailer
  
  **Configurar SMTP no .env.local:**
  ```
  SMTP_HOST="smtp.gmail.com"
  SMTP_PORT="587"
  SMTP_USER="seu-email@gmail.com"
  SMTP_PASS="sua-senha-de-app"
  NEXT_PUBLIC_APP_URL="http://localhost:3000"
  NEXT_PUBLIC_WHATS="5511999999999"
  NEXT_PUBLIC_INSTAGRAM="https://instagram.com/seuusuario"
  NEXT_PUBLIC_FACEBOOK="https://facebook.com/suapagina"
  JWT_SECRET="sua-chave-secreta"
  ```
  
  **Para Gmail:**
  1. Acesse: https://myaccount.google.com/apppasswords
  2. Crie uma senha de app
  3. Use essa senha no SMTP_PASS

- Executar códigos TS

  > npm install -D ts-node@10.9.2

- Shadcn/ui

  > npx shadcn@2.3.0 init
  > npx shadcn@2.3.0 add button
  > npx shadcn@2.3.0 add card
  > npx shadcn@2.3.0 add scroll-area
  > npx shadcn@2.3.0 add sheet
  > npx shadcn@2.3.0 add drawer
  > npx shadcn@2.3.0 add form
  > npx shadcn@2.3.0 add input
  > npx shadcn@2.3.0 add sonner
  > npx shadcn@2.3.0 add separator
  - Number Format
    > npm i react-number-format@5.4.3

Boas Praticas:
https://www.conventionalcommits.org/en/v1.0.0/

> npm install -D eslint-plugin-simple-import-sort@12.1.1
> npm install -D prettier-plugin-tailwindcss@0.6.5

---

Iniciar o APP

> npm run dev

Ajustar imports
> npm run lint -- --fix

- Deploy via vercel

>npm run build //Verificar erros

http://192.168.10.44:3000/agendou
http://192.168.10.44:3000/agendou/orders?Cellphone=11-97564-0573
http://192.168.10.44:3000/agendou/orders?cpf=11-97564-0573
http://192.168.10.44:3000/agendou/orders?CustomerCellPhone=11-97564-0573

---

## Acesso ao Monitor...

URL: http://localhost:3000/auth/login

**Credenciais de teste:**
- Email: `admin@agendou.com`
- Senha: `admin123`

Após o login, você será redirecionado para `/monitor` onde poderá visualizar:
- Total de agendamentos do comércio
- Receita total
- Total de produtos
- Agendamentos recentes com status
