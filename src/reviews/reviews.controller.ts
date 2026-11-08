import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ListReviewsQueryDto } from './dto/list-reviews-query.dto';
import { WalletAuthGuard } from '../auth/guards/wallet-auth.guard';
import { CurrentWallet } from '../auth/decorators/current-wallet.decorator';
import { setTotalCountHeader } from '../common/pagination';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  async findAll(
    @Query() query: ListReviewsQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const [rows, total] = await Promise.all([
      this.reviews.findAll(query),
      this.reviews.count(query),
    ]);
    setTotalCountHeader(res, total);
    return rows;
  }

  @Get('summary/:wallet')
  summaryFor(@Param('wallet') wallet: string) {
    return this.reviews.summaryFor(wallet);
  }

  @Get('escrow/:escrowId')
  findByEscrow(@Param('escrowId', ParseIntPipe) escrowId: number) {
    return this.reviews.findByEscrow(String(escrowId));
  }

  @Post('escrow/:escrowId')
  @HttpCode(201)
  @UseGuards(WalletAuthGuard)
  create(
    @Param('escrowId', ParseIntPipe) escrowId: number,
    @Body() dto: CreateReviewDto,
    @CurrentWallet() wallet: string,
  ) {
    return this.reviews.create(String(escrowId), wallet, dto);
  }
}
