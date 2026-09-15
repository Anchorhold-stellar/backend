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
} from '@nestjs/common';
import { ListingsService } from './listings.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListListingsQueryDto } from './dto/list-listings-query.dto';

@Controller('listings')
export class ListingsController {
  constructor(private readonly listings: ListingsService) {}

  @Get()
  findAll(@Query() query: ListListingsQueryDto) {
    return this.listings.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.listings.findById(id);
  }

  @Post()
  create(@Body() dto: CreateListingDto) {
    return this.listings.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateListingDto) {
    return this.listings.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.listings.delete(id);
  }
}
