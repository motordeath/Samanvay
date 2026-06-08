import { CertificationRepository } from "../repositories/certification.repository";

export class CertificationService {
  private repository =
    new CertificationRepository();

  async create(data: {
    name: string;
    description?: string;
  }) {
    return this.repository.create(data);
  }

  async findAll() {
    return this.repository.findAll();
  }

  async findById(id: string) {
    return this.repository.findById(id);
  }
}