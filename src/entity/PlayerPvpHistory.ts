import {
  Entity, PrimaryGeneratedColumn, PrimaryColumn, Column,
} from 'typeorm';

@Entity('player_pvp_history')
export class PlayerPvpHistoryEntity {
  @PrimaryGeneratedColumn()
  @PrimaryColumn({
    name: 'match_id',
    type: 'int'
  })
  matchId: number;

  @Column({
    name: 'player_id',
    type: 'nvarchar',
    length: '200',
    nullable: false
  })
  playerId: number;

  @Column({
    name: 'mode',
    type: 'varchar',
    length: '20',
    nullable: false
  })
  mode: string;

  @Column({
    name: 'score',
    type: 'bigint',
    default: 0,
  })
  score: number;

  @Column({
    name: 'result',
    type: 'varchar',
    length: '4',
    nullable: false
  })
  result: "win" | "lose";

  
  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

}