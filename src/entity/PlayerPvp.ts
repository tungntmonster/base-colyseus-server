import {
    Entity, PrimaryGeneratedColumn, PrimaryColumn, Column,
  } from 'typeorm';
  
  @Entity('player_pvp')
  export class PlayerPvpEntity {
    @PrimaryGeneratedColumn()
    @PrimaryColumn({
      name: 'player_id',
      type: 'int'
    })
    playerId: number;
  
    @Column({
      name: 'battlefield_score',
      type: 'int',
      nullable: false
    })
    battlefieldScore: number;
  
    @Column({
      name: 'created_at',
      type: 'timestamp',
      default: () => 'CURRENT_TIMESTAMP',
    })
    createdAt: Date;

    @Column({
      name: 'updated_at',
      type: 'timestamp',
      default: () => 'CURRENT_TIMESTAMP',
    })
    updatedAt: Date;
  
}