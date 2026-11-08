import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EscrowRepository } from '../escrow/escrow.repository';
import { ReputationService } from '../reputation/reputation.service';
import { ReviewsRepository } from './reviews.repository';
import { CreateReviewDto } from './dto/create-review.dto';
import { ListReviewsQueryDto } from './dto/list-reviews-query.dto';

/**
 * A review is only meaningful once the escrow actually completed — one for
 * each direction (renter → host, host → renter), matching how marketplaces
 * treat post-transaction feedback. Anything earlier (or from an outsider)
 * is rejected before it touches the database.
 */
@Injectable()
export class ReviewsService {
  constructor(
    private readonly reviews: ReviewsRepository,
    private readonly escrows: EscrowRepository,
    private readonly reputation: ReputationService,
  ) {}

  findByEscrow(escrowId: string) {
    return this.reviews.findByEscrow(escrowId);
  }

  findAll(query: ListReviewsQueryDto) {
    return this.reviews.findAll(query);
  }

  count(query: ListReviewsQueryDto) {
    return this.reviews.count(query);
  }

  summaryFor(revieweeWallet: string) {
    return this.reviews.summaryFor(revieweeWallet);
  }

  async create(escrowId: string, reviewerWallet: string, dto: CreateReviewDto) {
    if (dto.revieweeWallet === reviewerWallet) {
      throw new BadRequestException('cannot review yourself');
    }

    const escrow = await this.escrows.findById(escrowId);
    if (!escrow) {
      throw new NotFoundException('escrow not found');
    }
    if (escrow.status !== 'completed') {
      throw new BadRequestException(
        `escrow in status '${escrow.status}' cannot be reviewed — only completed escrows can`,
      );
    }

    const parties = [escrow.renter_wallet, escrow.host_wallet];
    if (!parties.includes(reviewerWallet) || !parties.includes(dto.revieweeWallet)) {
      throw new ForbiddenException('only the escrow renter and host can review each other');
    }
    if (reviewerWallet === dto.revieweeWallet) {
      throw new BadRequestException('cannot review yourself');
    }

    const existing = await this.reviews.findExisting(escrowId, reviewerWallet);
    if (existing) {
      throw new ConflictException('you have already reviewed this escrow');
    }

    const review = await this.reviews.create(escrowId, reviewerWallet, dto);

    // High ratings are a positive reputation signal, low ratings a negative
    // one; a middle-of-the-road 3 leaves the score untouched. Kept small
    // relative to dispute outcomes (±10/−5) so a single review can't swamp
    // adjudicated history.
    const delta = dto.rating - 3;
    if (delta !== 0) {
      await this.reputation.adjustScore(dto.revieweeWallet, delta);
    }

    return review;
  }
}
