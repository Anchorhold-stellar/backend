import { Body, Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JurorsService } from './jurors.service';
import { RegisterJurorDto } from './dto/register-juror.dto';
import { ListJurorsQueryDto } from './dto/list-jurors-query.dto';
import { WalletAuthGuard } from '../auth/guards/wallet-auth.guard';
import { CurrentWallet } from '../auth/decorators/current-wallet.decorator';
import { assertWalletMatches } from '../common/assert-wallet-match';
import { setTotalCountHeader } from '../common/pagination';

@ApiTags('jurors')
@Controller('jurors')
export class JurorsController {
  constructor(private readonly jurors: JurorsService) {}

  @Get()
  async findAll(
    @Query() query: ListJurorsQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const [rows, total] = await Promise.all([
      this.jurors.findAll(query),
      this.jurors.count(),
    ]);
    setTotalCountHeader(res, total);
    return rows;
  }

  @Get(':wallet')
  findOne(@Param('wallet') wallet: string) {
    return this.jurors.findByWallet(wallet);
  }

  @Post('register')
  @UseGuards(WalletAuthGuard)
  register(@Body() dto: RegisterJurorDto, @CurrentWallet() wallet: string) {
    assertWalletMatches(dto.wallet, wallet);
    return this.jurors.register(dto);
  }
}
