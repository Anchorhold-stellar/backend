import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ListingsService } from './listings.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListListingsQueryDto } from './dto/list-listings-query.dto';
import { WalletAuthGuard } from '../auth/guards/wallet-auth.guard';
import { CurrentWallet } from '../auth/decorators/current-wallet.decorator';
import { assertWalletMatches } from '../common/assert-wallet-match';
import { setTotalCountHeader } from '../common/pagination';

@ApiTags('listings')
@Controller('listings')
export class ListingsController {
  constructor(private readonly listings: ListingsService) {}

  @Get()
  async findAll(
    @Query() query: ListListingsQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const [rows, total] = await Promise.all([
      this.listings.findAll(query),
      this.listings.count(query),
    ]);
    setTotalCountHeader(res, total);
    return rows;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.listings.findById(id);
  }

  @Post()
  @UseGuards(WalletAuthGuard)
  create(@Body() dto: CreateListingDto, @CurrentWallet() wallet: string) {
    assertWalletMatches(dto.hostWallet, wallet);
    return this.listings.create(dto);
  }

  @Patch(':id')
  @UseGuards(WalletAuthGuard)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateListingDto,
    @CurrentWallet() wallet: string,
  ) {
    return this.listings.update(id, dto, wallet);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(WalletAuthGuard)
  remove(@Param('id') id: string, @CurrentWallet() wallet: string) {
    return this.listings.delete(id, wallet);
  }
}
