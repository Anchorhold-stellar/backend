import { Injectable, NotFoundException } from '@nestjs/common';
import { ListingsRepository } from './listings.repository';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListListingsQueryDto } from './dto/list-listings-query.dto';

@Injectable()
export class ListingsService {
  constructor(private readonly listings: ListingsRepository) {}

  findAll(query: ListListingsQueryDto) {
    return this.listings.findAll(query);
  }

  async findById(id: string) {
    const listing = await this.listings.findById(id);
    if (!listing) {
      throw new NotFoundException('listing not found');
    }
    return listing;
  }

  create(dto: CreateListingDto) {
    return this.listings.create(dto);
  }

  async update(id: string, dto: UpdateListingDto) {
    const listing = await this.listings.update(id, dto);
    if (!listing) {
      throw new NotFoundException('listing not found');
    }
    return listing;
  }

  async delete(id: string) {
    const deleted = await this.listings.delete(id);
    if (!deleted) {
      throw new NotFoundException('listing not found');
    }
  }
}
