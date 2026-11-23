// Erro com mensagem para o usuário (e status HTTP). As rotas respondem com
// `{ error: message }` via handleError.
export class UserError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
    this.name = "UserError";
  }
}
