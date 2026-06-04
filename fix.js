const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, searchRegex, replaceWith) {
  const fullPath = path.join(__dirname, filePath);
  let content = fs.readFileSync(fullPath, 'utf8');
  content = content.replace(searchRegex, replaceWith);
  fs.writeFileSync(fullPath, content);
}

replaceInFile('src/auth/auth.controller.ts', /import \{ Request \} from 'express';/g, "import type { Request } from 'express';");

replaceInFile('src/auth/auth.module.ts', /expiresIn: process\.env\.JWT_EXPIRES_IN \|\| '15m'/g, "expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any");

replaceInFile('src/auth/auth.service.ts', /expiresIn: process\.env\.JWT_EXPIRES_IN \|\| '15m'/g, "expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any");

replaceInFile('src/auth/strategies/jwt.strategy.ts', /jwtid: true/g, "");

replaceInFile('src/modules/auditoria/auditoria.interceptor.ts', /datosAnteriores: null/g, "datosAnteriores: undefined");
replaceInFile('src/modules/auditoria/auditoria.interceptor.ts', /registroId: data\?\.id \|\| null/g, "registroId: data?.id || undefined");
replaceInFile('src/modules/auditoria/auditoria.interceptor.ts', /usuarioId: user\?\.sub \|\| null/g, "usuarioId: user?.sub || undefined");


replaceInFile('src/modules/dispositivos/dispositivos.controller.ts', /import \{ Request \} from 'express';/g, "import type { Request } from 'express';");

replaceInFile('src/modules/sesiones/sesiones.controller.ts', /import \{ Request \} from 'express';/g, "import type { Request } from 'express';");

replaceInFile('src/modules/usuarios/usuarios.service.ts', /const data = \{ \.\.\.updateUsuarioDto \};/g, "const data: any = { ...updateUsuarioDto };");

console.log('Fixed typescript errors.');
