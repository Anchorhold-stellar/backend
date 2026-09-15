import { Injectable, NotFoundException } from '@nestjs/common';
import { JurorsRepository } from './jurors.repository';
import { RegisterJurorDto } from './dto/register-juror.dto';
import { ListJurorsQueryDto } from './dto/list-jurors-query.dto';

@Injectable()
export class JurorsService {
  constructor(private readonly jurors: JurorsRepository) {}

  register(dto: RegisterJurorDto) {
    return this.jurors.register(dto.wallet, dto.stakeAmount);
  }

  async findByWallet(wallet: string) {
    const juror = await this.jurors.findByWallet(wallet);
    if (!juror) {
      throw new NotFoundException('juror not found');
    }
    return juror;
  }

  findAll(query: ListJurorsQueryDto) {
    return this.jurors.findAll(query);
  }
}
