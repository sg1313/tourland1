const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('planboard', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      comment: "번호"
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "제목"
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "내용"
    },
    writer: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: "작성자"
    },
    regdate: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
      comment: "작성일자"
    },
    lcate: {
      type: DataTypes.CHAR(1),
      allowNull: true,
      comment: "대분류"
    },
    mcate: {
      type: DataTypes.CHAR(1),
      allowNull: true,
      comment: "중분류"
    },
    answer: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      comment: "답변상태"
    },
    respond: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "답변내용"
    }
  }, {
    sequelize,
    tableName: 'planboard',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "no" },
        ]
      },
    ]
  });
};
