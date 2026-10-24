/**
 * Devuelve el secreto JWT obligatorio. El servidor no debe arrancar con un
 * valor por defecto hardcodeado: eso permitiría falsificar tokens.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error(
      'JWT_SECRET no está configurado. El servidor no puede iniciar sin un secreto explícito.',
    );
  }
  return secret;
}
