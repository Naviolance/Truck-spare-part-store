import { IsInt, IsString, IsOptional, Min, Max, MaxLength } from "class-validator";

export class UpdateReviewDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
