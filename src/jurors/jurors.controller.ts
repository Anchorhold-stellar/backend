import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JurorsService } from './jurors.service';
import { RegisterJurorDto } from './dto/register-juror.dto';
import { ListJurorsQueryDto } from './dto/list-jurors-query.dto';
import { WalletAuthGuard } from '../auth/guards/wallet-auth.guard';
import { CurrentWallet } from '../auth/decorators/current-wallet.decorator';
import { assertWalletMatches } from '../common/assert-wallet-match';

@ApiTags('jurors')
@Controller('jurors')
export class JurorsController {
  constructor(private readonly jurors: JurorsService) {}

  @Get()
  findAll(@Query() query: ListJurorsQueryDto) {
    return this.jurors.findAll(query);
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
