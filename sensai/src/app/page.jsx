import Image from "next/image";
import {Button} from "@/components/ui/button";
import HeroSection from "@/components/hero";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { features } from "@/data/features";
export default function Home() {
  return (
    <div>
<HeroSection/>
    <section className="py-20">
  <h2 className="text-3xl font-bold text-center mb-12">
    Powerful Features for Your Career Growth
  </h2>

  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
    {features.map((feature, index) => (
      <Card
        key={index}
        className="border-2 hover:border-primary transition-colors duration-300"
      >
        <CardContent className="pt-6 text-center flex flex-col items-center">
          <div className="flex flex-col items-center justify-center">
            <div className="text-4xl mb-4">{feature.icon}</div>
            <h3 className="text-xl font-bold mb-2">
              {feature.title}
            </h3>
            <p className="text-muted-foreground">
              {feature.description}
            </p>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
</section>
    </div>
  
  );
}
