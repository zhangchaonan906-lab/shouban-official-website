export type ParentCompanyQualification = {
  readonly title: string;
  readonly holder: "北京首版科技有限公司";
  readonly reference: string;
  readonly dateLabel: string;
  readonly image?: {
    readonly src: string;
    readonly alt: string;
    readonly width: number;
    readonly height: number;
  };
};

export const parentCompanyRelationship =
  "北京首版认证有限公司的母公司北京首版科技有限公司持有相关资质与行业认可。";

export const parentCompanyQualifications: readonly ParentCompanyQualification[] = [
  {
    title: "国家高新技术企业",
    holder: "北京首版科技有限公司",
    reference: "GR202311001132",
    dateLabel: "2023年10月26日发证 · 有效期三年",
    image: {
      src: "/images/qualifications/national-high-tech.webp",
      alt: "北京首版科技有限公司国家高新技术企业证书",
      width: 1400,
      height: 969
    }
  },
  {
    title: "中关村高新技术企业",
    holder: "北京首版科技有限公司",
    reference: "20252080455501",
    dateLabel: "2025年8月22日发证 · 有效期三年",
    image: {
      src: "/images/qualifications/zgc-high-tech.webp",
      alt: "北京首版科技有限公司中关村高新技术企业证书",
      width: 1400,
      height: 963
    }
  },
  {
    title: "ICP/EDI 增值电信业务经营许可",
    holder: "北京首版科技有限公司",
    reference: "京B2-20223420",
    dateLabel: "有效至2027年9月16日",
    image: {
      src: "/images/qualifications/icp-edi.webp",
      alt: "北京首版科技有限公司ICP/EDI增值电信业务经营许可证",
      width: 991,
      height: 1400
    }
  },
  {
    title: "全国 SP 增值电信业务经营许可",
    holder: "北京首版科技有限公司",
    reference: "B2-20223716",
    dateLabel: "有效至2027年8月23日",
    image: {
      src: "/images/qualifications/sp-license.webp",
      alt: "北京首版科技有限公司全国SP增值电信业务经营许可证",
      width: 991,
      height: 1400
    }
  },
  {
    title: "北京市版权局同意设立版权工作站",
    holder: "北京首版科技有限公司",
    reference: "京权发〔2022〕1号",
    dateLabel: "2022年3月8日",
    image: {
      src: "/images/qualifications/copyright-workstation.webp",
      alt: "北京市版权局同意北京首版科技有限公司设立版权工作站通知",
      width: 991,
      height: 1400
    }
  },
  {
    title: "媒体融合创新技术与服务应用优秀推荐项目",
    holder: "北京首版科技有限公司",
    reference: "数字图文智能版权资产管理服务平台",
    dateLabel: "北京市广播电视局 · 2023年6月"
  }
];
