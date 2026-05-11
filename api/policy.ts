import { getPolicyHtml } from '../src/controllers/pages';

export default function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(getPolicyHtml());
}
