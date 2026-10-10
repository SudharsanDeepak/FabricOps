import { Product } from '../models/index.js';
import { calculateProductATP } from '../services/feasibility.service.js';
import { logger } from '../config/logger.js';

export const getPublishedProducts = async (req, res, next) => {
  try {
    const { category, search } = req.query;
    const filter = { isPublished: true };

    if (category) {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { productCode: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const products = await Product.find(filter).sort({ name: 1 });

    // Compute ATP and indicative lead time for each product
    const productsWithATP = await Promise.all(
      products.map(async (product) => {
        const atpInfo = await calculateProductATP(product);
        return {
          ...product.toObject(),
          atp: atpInfo,
        };
      })
    );

    res.json({
      success: true,
      data: productsWithATP,
      count: productsWithATP.length,
    });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found' },
      });
    }

    const atpInfo = await calculateProductATP(product);

    res.json({
      success: true,
      data: {
        ...product.toObject(),
        atp: atpInfo,
      },
    });
  } catch (error) {
    next(error);
  }
};

